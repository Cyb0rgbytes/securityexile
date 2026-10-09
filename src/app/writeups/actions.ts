"use server";

/*
 * Writeup mutations: requireMember → load row → permission → Zod → render → write (+ audit) in one batch → revalidate.
 * body_html is always produced here by renderWriteup(); nothing else writes it.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { requireMember } from "@/lib/auth/member";
import { isStaff } from "@/lib/auth/platform";
import { getDb, getEnv } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/errors";
import { newId } from "@/lib/db/ids";
import { auditLog, events, uploads, writeupSeries, writeupTags, writeups } from "@/lib/db/schema";
import { slugify } from "@/lib/events/validation";
import { hit, LIMITS, MAX_DRAFTS, retryMessage } from "@/lib/security/rate-limit";
import { auditEntry } from "@/lib/teams/audit";
import { findMembershipOf } from "@/lib/teams/queries";
import { filesOrigin } from "@/lib/writeups/files";
import { canEditWriteup } from "@/lib/writeups/permissions";
import { chunk, findWriteupById } from "@/lib/writeups/queries";
import { renderWriteup } from "@/lib/writeups/render";
import { idSchema, parseTags, writeupInputSchema } from "@/lib/writeups/validation";
import { spoilerFor } from "@/lib/writeups/visibility";
import type { ActionState } from "@/app/teams/actions";

export type SaveState = ActionState & { id?: string; savedAt?: number; seriesId?: string };

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Invalid input.";
const notFound = { error: "Writeup not found." } as const;

function revalidateWriteups(handle?: string | null, slug?: string) {
  revalidatePath("/writeups");
  revalidatePath("/me/writeups");
  if (handle) revalidatePath(`/u/${handle}`);
  if (handle && slug) revalidatePath(`/w/${handle}/${slug}`);
}

/** Image URLs in the body that point at this member's uploads → link them to the writeup. */
function uploadIdsIn(md: string, origin: string): string[] {
  const re = new RegExp(`${origin.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}/u/[0-9A-Z]{26}/([0-9A-Z]{26})\\.(?:png|jpg|webp|gif)`, "g");
  return [...new Set([...md.matchAll(re)].map((m) => m[1]))].slice(0, 200);
}

export async function saveWriteup(id: string | null, _prev: SaveState, form: FormData): Promise<SaveState> {
  const member = await requireMember();
  const db = getDb();
  const fields = {
    title: String(form.get("title") ?? ""),
    bodyMd: String(form.get("bodyMd") ?? "").replace(/\r\n/g, "\n"),
    category: String(form.get("category") ?? ""),
    difficulty: String(form.get("difficulty") ?? ""),
    eventId: String(form.get("eventId") ?? ""),
    seriesId: String(form.get("seriesId") ?? ""),
    seriesTitle: String(form.get("seriesTitle") ?? ""),
    seriesOrder: String(form.get("seriesOrder") ?? ""),
    asTeam: String(form.get("asTeam") ?? ""),
  };
  const tags = parseTags(String(form.get("tags") ?? ""));
  if ("error" in tags) return { error: tags.error };
  const parsed = writeupInputSchema.safeParse({ ...fields, tags });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;

  let existing = null;
  if (id) {
    if (!idSchema.safeParse(id).success) return notFound;
    existing = (await findWriteupById(db, id)) ?? null;
    if (!existing || !canEditWriteup(existing, member.id)) return notFound;
  }

  // Saves render up to 100 KB and write a large row: cap the rate, and the number of drafts.
  const rl = await hit(getEnv(), `writeup-save:${member.id}`, LIMITS.writeupSave);
  if (!rl.ok) return { error: retryMessage(rl) };
  if (!existing) {
    const [{ drafts }] = await db.select({ drafts: count() }).from(writeups).where(and(eq(writeups.authorId, member.id), isNull(writeups.publishedAt)));
    if (drafts >= MAX_DRAFTS) return { error: `You have ${MAX_DRAFTS} drafts. Publish or delete some before starting another.` };
  }

  const membership = await findMembershipOf(db, member.id);
  const teamId = v.asTeam ? (membership?.team.id ?? null) : null;
  if (v.asTeam && !teamId) return { error: "Join a team before posting as a team." };

  const event = v.eventId ? await db.query.events.findFirst({ columns: { id: true, endsAt: true, hiddenAt: true, ownerTeamId: true }, where: eq(events.id, v.eventId) }) : null;
  if (v.eventId && (!event || (event.hiddenAt && event.ownerTeamId !== membership?.team.id))) return { error: "That event doesn't exist." };

  let seriesId: string | null = null;
  const seriesOps = [];
  if (v.seriesId) {
    const s = await db.query.writeupSeries.findFirst({ where: and(eq(writeupSeries.id, v.seriesId), eq(writeupSeries.authorId, member.id)) });
    if (!s) return { error: "That series doesn't exist." };
    seriesId = s.id;
  } else if (v.seriesTitle) {
    seriesId = newId();
    seriesOps.push(db.insert(writeupSeries).values({ id: seriesId, authorId: member.id, title: v.seriesTitle, slug: `${slugify(v.seriesTitle)}-${seriesId.slice(-4).toLowerCase()}` }));
  }

  const origin = filesOrigin();
  const bodyHtml = renderWriteup(v.bodyMd, { filesOrigin: origin });
  const writeupId = existing?.id ?? newId();
  const base = slugify(v.title);
  const slug = existing?.slug ?? `${base}-${writeupId.slice(-4).toLowerCase()}`;
  const row = {
    title: v.title, bodyMd: v.bodyMd, bodyHtml, category: v.category || null, difficulty: v.difficulty || null,
    eventId: event?.id ?? null, spoilerUntil: spoilerFor(event ?? null), teamId, seriesId, seriesOrder: seriesId ? v.seriesOrder : null,
  };
  const uploadIds = uploadIdsIn(v.bodyMd, origin);

  // Order matters: a new series row must exist before the writeup references it.
  const ops: BatchItem<"sqlite">[] = [
    ...seriesOps,
    existing
      ? db.update(writeups).set(row).where(and(eq(writeups.id, writeupId), eq(writeups.authorId, member.id)))
      : db.insert(writeups).values({ id: writeupId, authorId: member.id, slug, ...row }),
    db.delete(writeupTags).where(eq(writeupTags.writeupId, writeupId)),
  ];
  if (v.tags.length) ops.push(db.insert(writeupTags).values(v.tags.map((tag) => ({ writeupId, tag }))));
  // Chunked: D1 binds at most 100 parameters per statement.
  for (const part of chunk(uploadIds, 90)) ops.push(db.update(uploads).set({ writeupId }).where(and(eq(uploads.ownerId, member.id), inArray(uploads.id, part))));
  try {
    await db.batch(ops as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (e) {
    if (isUniqueViolation(e, "writeups")) return { error: "You already have a writeup with that address. Try a different title." };
    throw e;
  }
  revalidateWriteups(member.handle, slug);
  return { ok: "Saved.", id: writeupId, savedAt: Date.now(), seriesId: seriesId ?? undefined };
}

export async function setPublished(id: string, publish: boolean): Promise<ActionState> {
  const member = await requireMember();
  if (!idSchema.safeParse(id).success) return notFound;
  const db = getDb();
  const w = await findWriteupById(db, id);
  if (!w || !canEditWriteup(w, member.id)) return notFound;
  if (publish) {
    if (w.publishedAt) return { ok: "Already published." };
    if (w.bodyMd.trim().length < 20) return { error: "Write a little more before publishing (20+ characters)." };
    const rl = await hit(getEnv(), `publish:${member.id}`, LIMITS.writeupPublish);
    if (!rl.ok) return { error: retryMessage(rl) };
  }
  await db.batch([
    db.update(writeups).set({ publishedAt: publish ? new Date() : null }).where(eq(writeups.id, w.id)),
    db.insert(auditLog).values(auditEntry({ teamId: w.teamId, actorId: member.id, action: publish ? "writeup.publish" : "writeup.unpublish", targetId: w.id, meta: { title: w.title } })),
  ]);
  revalidateWriteups(member.handle, w.slug);
  return { ok: publish ? "Published." : "Moved back to drafts." };
}

export async function deleteWriteup(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  if (!idSchema.safeParse(id).success) return notFound;
  const db = getDb();
  const w = await findWriteupById(db, id);
  if (!w || !canEditWriteup(w, member.id)) return notFound;
  if (String(form.get("confirm") ?? "").trim() !== "delete") return { error: 'Type "delete" to confirm.' };
  // Images this writeup used go with it, instead of staying public until the next sweep,
  // unless another of the author's writeups still embeds them (uploads.writeup_id only
  // records the last writeup saved with the image).
  const images = await db
    .select({ id: uploads.id, r2Key: uploads.r2Key })
    .from(uploads)
    .where(
      and(
        eq(uploads.writeupId, w.id),
        eq(uploads.ownerId, member.id),
        sql`not exists (select 1 from ${writeups} where ${writeups.authorId} = ${member.id} and ${writeups.id} <> ${w.id} and instr(${writeups.bodyMd}, ${uploads.id}) > 0)`,
      ),
    );
  await db.batch([
    db.delete(writeups).where(eq(writeups.id, w.id)),
    ...chunk(images.map((i) => i.id), 90).map((part) => db.delete(uploads).where(inArray(uploads.id, part))),
    // A draft was only ever visible to its author: its title must not land in the team's log.
    db.insert(auditLog).values(
      w.publishedAt
        ? auditEntry({ teamId: w.teamId, actorId: member.id, action: "writeup.delete", targetId: w.id, meta: { title: w.title } })
        : auditEntry({ teamId: null, actorId: member.id, action: "writeup.delete", targetId: w.id }),
    ),
  ]);
  if (images.length) {
    try {
      await getEnv().UPLOADS.delete(images.map((i) => i.r2Key));
    } catch (e) {
      // Rows are gone, so sweep-uploads.mjs won't see these keys; log them for a manual delete.
      console.error("writeup delete: R2 cleanup failed", { keys: images.map((i) => i.r2Key), e });
    }
  }
  revalidateWriteups(member.handle, w.slug);
  redirect("/me/writeups");
}

export async function setWriteupHidden(id: string, hidden: boolean): Promise<ActionState> {
  const member = await requireMember();
  if (!isStaff(member.platformRole)) return notFound;
  if (!idSchema.safeParse(id).success) return notFound;
  const db = getDb();
  const w = await findWriteupById(db, id);
  if (!w) return notFound;
  await db.batch([
    db.update(writeups).set({ hiddenAt: hidden ? new Date() : null }).where(eq(writeups.id, w.id)),
    db.insert(auditLog).values(auditEntry({ teamId: null, actorId: member.id, action: hidden ? "writeup.hide" : "writeup.unhide", targetId: w.id, meta: { title: w.title } })),
  ]);
  revalidatePath("/writeups");
  return { ok: hidden ? "Writeup hidden." : "Writeup restored." };
}

export async function previewMarkdown(md: string): Promise<{ html?: string; error?: string }> {
  const member = await requireMember();
  if (typeof md !== "string" || md.length > 100_000) return { error: "The writeup is over 100 000 characters." };
  const rl = await hit(getEnv(), `preview:${member.id}`, LIMITS.preview);
  if (!rl.ok) return { error: retryMessage(rl) };
  return { html: renderWriteup(md, { filesOrigin: filesOrigin() }) };
}
