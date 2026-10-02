"use server";

/*
 * War-room mutations. Every action: loadWarRoom (member of a registered team, room writable)
 * → rate limit → Zod → conditional write → revalidate. Status changes use
 * UPDATE … WHERE status = <expected>, so concurrent clicks can't both win.
 */
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { getEnv } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/errors";
import { newId } from "@/lib/db/ids";
import { challenges, eventRegistrations, users } from "@/lib/db/schema";
import { MOVES, nextStatus, type Move } from "@/lib/events/permissions";
import { loadWarRoom } from "@/lib/events/war-room";
import { challengeInputSchema, challengeNotesSchema, parseLinks, teamNotesSchema } from "@/lib/events/validation";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import type { ActionState } from "@/app/teams/actions";

export type NotesState = ActionState & { savedAt?: number };

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Invalid input.";
const idOk = (id: string) => /^[0-9A-Z]{26}$/.test(id);
/** Rows changed by a D1 write. */
const changes = (res: unknown) => (res as { meta: { changes: number } }).meta.changes;

async function writeLimit(memberId: string) {
  const rl = await hit(getEnv().KV, `war-write:${memberId}`, LIMITS.warRoomWrite);
  return rl.ok ? null : retryMessage(rl);
}

export async function addChallenge(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team } = ctx;
  const fields = { name: String(form.get("name") ?? ""), points: String(form.get("points") ?? "") };
  const parsed = challengeInputSchema.safeParse({ ...fields, category: form.get("category") });
  if (!parsed.success) return { error: firstIssue(parsed.error), fields };
  const rl = await hit(getEnv().KV, `chal-create:${member.id}`, LIMITS.challengeCreate);
  if (!rl.ok) return { error: retryMessage(rl), fields };
  try {
    await db.insert(challenges).values({
      id: newId(),
      eventId: event.id,
      teamId: team.id,
      name: parsed.data.name,
      category: parsed.data.category,
      points: parsed.data.points,
      createdBy: member.id,
    });
  } catch (e) {
    if (isUniqueViolation(e, "challenges_name_uq")) return { error: "Your team already has a challenge with that name.", fields };
    throw e;
  }
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: `Added ${parsed.data.name}.` };
}

export async function moveChallenge(slug: string, challengeId: string, move: Move): Promise<ActionState> {
  if (!idOk(challengeId) || !(MOVES as readonly string[]).includes(move)) return { error: "Unknown challenge." };
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team, teamRole } = ctx;
  const limited = await writeLimit(member.id);
  if (limited) return { error: limited };

  const current = await db.query.challenges.findFirst({
    where: and(eq(challenges.id, challengeId), eq(challenges.eventId, event.id), eq(challenges.teamId, team.id)),
  });
  if (!current) return { error: "Unknown challenge." };
  const isLead = teamRole === "captain" || teamRole === "co_captain";
  const to = nextStatus(current.status, move, { isClaimer: current.claimedBy === member.id, isLead });
  if (!to) return { error: "That move isn't available. Refresh to see the latest board." };

  const patch =
    to === "open"
      ? { status: to, claimedBy: null, solvedAt: null }
      : to === "claimed"
        ? { status: to, claimedBy: member.id }
        : to === "solved"
          ? { status: to, solvedAt: new Date(), claimedBy: current.claimedBy ?? member.id }
          : { status: to };

  const res = await db
    .update(challenges)
    .set(patch)
    .where(and(eq(challenges.id, current.id), eq(challenges.teamId, team.id), eq(challenges.status, current.status)));
  if (changes(res) === 0) {
    const [now] = await db
      .select({ status: challenges.status, claimer: users.handle })
      .from(challenges)
      .leftJoin(users, eq(users.id, challenges.claimedBy))
      .where(eq(challenges.id, current.id));
    return {
      error: now?.claimer && now.status !== "open" ? `Already ${now.status} by @${now.claimer}.` : "Someone changed this challenge first. Refresh to see the latest board.",
    };
  }
  revalidatePath(`/events/${event.slug}/war-room`);
  return {};
}

export async function saveChallengeNotes(slug: string, challengeId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  if (!idOk(challengeId)) return { error: "Unknown challenge." };
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team } = ctx;
  const limited = await writeLimit(member.id);
  if (limited) return { error: limited };
  const notes = challengeNotesSchema.safeParse(String(form.get("notes") ?? ""));
  if (!notes.success) return { error: firstIssue(notes.error) };
  const links = parseLinks(String(form.get("links") ?? ""));
  if ("error" in links) return { error: links.error };
  const res = await db
    .update(challenges)
    .set({ notesMd: notes.data || null, links })
    .where(and(eq(challenges.id, challengeId), eq(challenges.eventId, event.id), eq(challenges.teamId, team.id)));
  if (changes(res) === 0) return { error: "Unknown challenge." };
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: "Saved." };
}

export async function deleteChallenge(slug: string, challengeId: string): Promise<ActionState> {
  if (!idOk(challengeId)) return { error: "Unknown challenge." };
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team, teamRole } = ctx;
  const current = await db.query.challenges.findFirst({
    where: and(eq(challenges.id, challengeId), eq(challenges.teamId, team.id), eq(challenges.eventId, event.id)),
  });
  if (!current) return { error: "Unknown challenge." };
  const isLead = teamRole === "captain" || teamRole === "co_captain";
  if (!isLead && current.createdBy !== member.id) return { error: "Only the person who added it or a captain can delete a challenge." };
  await db.delete(challenges).where(and(eq(challenges.id, current.id), eq(challenges.teamId, team.id)));
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: "Deleted." };
}

/**
 * Saves the team notepad only if nobody saved since this editor loaded it
 * (`loadedAt` = the notes_updated_at the editor started from; 0 = never saved).
 */
export async function saveTeamNotes(slug: string, _prev: NotesState, form: FormData): Promise<NotesState> {
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team } = ctx;
  const limited = await writeLimit(member.id);
  if (limited) return { error: limited };
  const notes = teamNotesSchema.safeParse(String(form.get("notes") ?? ""));
  if (!notes.success) return { error: firstIssue(notes.error) };
  const loaded = Number(form.get("loadedAt") ?? 0);
  if (!Number.isSafeInteger(loaded) || loaded < 0) return { error: "Reload the page and try again." };
  const savedAt = new Date(Math.max(Date.now(), loaded + 1));
  const res = await db
    .update(eventRegistrations)
    .set({ notesMd: notes.data, notesUpdatedAt: savedAt })
    .where(
      and(
        eq(eventRegistrations.eventId, event.id),
        eq(eventRegistrations.teamId, team.id),
        loaded > 0 ? eq(eventRegistrations.notesUpdatedAt, new Date(loaded)) : isNull(eventRegistrations.notesUpdatedAt),
      ),
    );
  if (changes(res) === 0) return { error: "A teammate edited these notes. Copy your text, reload, and merge." };
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: "Notes saved.", savedAt: savedAt.getTime() };
}
