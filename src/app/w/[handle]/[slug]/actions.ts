"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNull } from "drizzle-orm";
import { requireMember } from "@/lib/auth/member";
import { isStaff } from "@/lib/auth/platform";
import { getDb, getEnv } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { auditLog, bookmarks, comments, users, votes, writeups } from "@/lib/db/schema";
import { requestNow } from "@/lib/events/clock";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { auditEntry } from "@/lib/teams/audit";
import { findMembershipOf } from "@/lib/teams/queries";
import { canEditComment, canVote, MAX_COMMENT_DEPTH } from "@/lib/writeups/permissions";
import { findWriteupById } from "@/lib/writeups/queries";
import { renderComment } from "@/lib/writeups/render";
import { trendingScore } from "@/lib/writeups/ranking";
import { commentInputSchema, idSchema } from "@/lib/writeups/validation";
import { canRead } from "@/lib/writeups/visibility";
import type { ActionState } from "@/app/teams/actions";

const notFound = { error: "Writeup not found." } as const;

/** Loads a writeup the member may read (same rule as the page), or null. */
async function readable(writeupId: string) {
  const member = await requireMember();
  if (!idSchema.safeParse(writeupId).success) return null;
  const db = getDb();
  const w = await findWriteupById(db, writeupId);
  if (!w) return null;
  const membership = await findMembershipOf(db, member.id);
  const ok = canRead(w, { userId: member.id, teamId: membership?.team.id ?? null, platformRole: member.platformRole }, requestNow());
  return ok ? { db, member, w } : null;
}

async function pathFor(db: ReturnType<typeof getDb>, w: { authorId: string; slug: string }) {
  const a = await db.query.users.findFirst({ columns: { handle: true }, where: eq(users.id, w.authorId) });
  return `/w/${a?.handle}/${w.slug}`;
}

export async function toggleVote(writeupId: string): Promise<ActionState & { voted?: boolean; count?: number }> {
  const ctx = await readable(writeupId);
  if (!ctx) return notFound;
  const { db, member, w } = ctx;
  if (!w.publishedAt) return { error: "Publish first." };
  if (!canVote(w, member.id)) return { error: "You can't upvote your own writeup." };
  const rl = await hit(getEnv(), `vote:${member.id}`, LIMITS.voteBookmark);
  if (!rl.ok) return { error: retryMessage(rl) };
  const had = await db.query.votes.findFirst({ where: and(eq(votes.writeupId, w.id), eq(votes.userId, member.id)) });
  // One batch: change the vote, then recount, so double-clicks can't drift the counter.
  await db.batch([
    had
      ? db.delete(votes).where(and(eq(votes.writeupId, w.id), eq(votes.userId, member.id)))
      : db.insert(votes).values({ writeupId: w.id, userId: member.id, value: 1 }).onConflictDoNothing(),
    db.update(writeups).set({ voteCount: db.$count(votes, eq(votes.writeupId, w.id)) }).where(eq(writeups.id, w.id)),
  ]);
  const [{ n }] = await db.select({ n: count() }).from(votes).where(eq(votes.writeupId, w.id));
  await db.update(writeups).set({ score: Math.round(trendingScore(n, w.publishedAt, requestNow()) * 1_000_000) }).where(eq(writeups.id, w.id));
  revalidatePath(await pathFor(db, w));
  return { voted: !had, count: n };
}

export async function toggleBookmark(writeupId: string): Promise<ActionState & { saved?: boolean }> {
  const ctx = await readable(writeupId);
  if (!ctx) return notFound;
  const { db, member, w } = ctx;
  const rl = await hit(getEnv(), `vote:${member.id}`, LIMITS.voteBookmark);
  if (!rl.ok) return { error: retryMessage(rl) };
  const had = await db.query.bookmarks.findFirst({ where: and(eq(bookmarks.writeupId, w.id), eq(bookmarks.userId, member.id)) });
  if (had) await db.delete(bookmarks).where(and(eq(bookmarks.writeupId, w.id), eq(bookmarks.userId, member.id)));
  else await db.insert(bookmarks).values({ writeupId: w.id, userId: member.id }).onConflictDoNothing();
  revalidatePath("/me/bookmarks");
  return { saved: !had };
}

async function depthOf(db: ReturnType<typeof getDb>, parentId: string): Promise<number> {
  let depth = 1;
  let cur: string | null = parentId;
  while (cur && depth <= MAX_COMMENT_DEPTH) {
    const p: { parentId: string | null } | undefined = await db.query.comments.findFirst({ columns: { parentId: true }, where: eq(comments.id, cur) });
    if (!p) break;
    cur = p.parentId;
    depth++;
  }
  return depth;
}

export async function addComment(writeupId: string, parentId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await readable(writeupId);
  if (!ctx) return notFound;
  const { db, member, w } = ctx;
  if (!w.publishedAt) return { error: "Comments open once the writeup is published." };
  // The page hides the box on moderated writeups; the action must refuse too.
  if (w.hiddenAt) return { error: "Comments are closed on this writeup." };
  const parsed = commentInputSchema.safeParse({ bodyMd: String(form.get("bodyMd") ?? "").replace(/\r\n/g, "\n") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parentId) {
    if (!idSchema.safeParse(parentId).success) return { error: "That comment doesn't exist." };
    const parent = await db.query.comments.findFirst({ where: and(eq(comments.id, parentId), eq(comments.writeupId, w.id)) });
    if (!parent) return { error: "That comment doesn't exist." };
    if ((await depthOf(db, parentId)) >= MAX_COMMENT_DEPTH + 1) return { error: "Replies go at most 3 levels deep." };
  }
  const rl = await hit(getEnv(), `comment:${member.id}`, LIMITS.comment);
  if (!rl.ok) return { error: retryMessage(rl) };
  await db.batch([
    db.insert(comments).values({ id: newId(), writeupId: w.id, authorId: member.id, parentId, bodyMd: parsed.data.bodyMd, bodyHtml: renderComment(parsed.data.bodyMd) }),
    db.update(writeups).set({ commentCount: db.$count(comments, and(eq(comments.writeupId, w.id))) }).where(eq(writeups.id, w.id)),
  ]);
  revalidatePath(await pathFor(db, w));
  return { ok: "Posted." };
}

async function ownComment(commentId: string) {
  if (!idSchema.safeParse(commentId).success) return null;
  const db = getDb();
  const c = await db.query.comments.findFirst({ where: eq(comments.id, commentId) });
  if (!c) return null;
  const ctx = await readable(c.writeupId);
  return ctx ? { ...ctx, c } : null;
}

export async function editComment(commentId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await ownComment(commentId);
  if (!ctx) return { error: "Comment not found." };
  const { db, member, c, w } = ctx;
  if (!canEditComment(c, member.id, requestNow())) return { error: "Comments can only be edited by their author for 15 minutes." };
  const parsed = commentInputSchema.safeParse({ bodyMd: String(form.get("bodyMd") ?? "").replace(/\r\n/g, "\n") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  // Each edit re-renders Markdown: shares the comment budget so it can't be used to burn CPU.
  const rl = await hit(getEnv(), `comment:${member.id}`, LIMITS.comment);
  if (!rl.ok) return { error: retryMessage(rl) };
  await db.update(comments).set({ bodyMd: parsed.data.bodyMd, bodyHtml: renderComment(parsed.data.bodyMd), editedAt: new Date() }).where(eq(comments.id, c.id));
  revalidatePath(await pathFor(db, w));
  return { ok: "Saved." };
}

export async function deleteComment(commentId: string): Promise<ActionState> {
  // Authorship alone is enough: an author keeps the right to remove their words even
  // after losing read access to the writeup (unpublished, hidden, spoiler-locked).
  const member = await requireMember();
  if (!idSchema.safeParse(commentId).success) return { error: "Comment not found." };
  const db = getDb();
  const deleted = await db
    .update(comments)
    .set({ deletedAt: new Date(), bodyMd: "", bodyHtml: "" })
    .where(and(eq(comments.id, commentId), eq(comments.authorId, member.id), isNull(comments.deletedAt)))
    .returning({ writeupId: comments.writeupId });
  if (deleted.length === 0) return { error: "Comment not found." };
  const w = await db.query.writeups.findFirst({ columns: { authorId: true, slug: true }, where: eq(writeups.id, deleted[0].writeupId) });
  if (w) revalidatePath(await pathFor(db, w));
  return { ok: "Deleted." };
}

export async function setCommentHidden(commentId: string, hidden: boolean): Promise<ActionState> {
  const ctx = await ownComment(commentId);
  if (!ctx) return { error: "Comment not found." };
  const { db, member, c, w } = ctx;
  if (!isStaff(member.platformRole)) return { error: "Comment not found." };
  await db.batch([
    db.update(comments).set({ hiddenAt: hidden ? new Date() : null }).where(eq(comments.id, c.id)),
    db.insert(auditLog).values(auditEntry({ teamId: null, actorId: member.id, action: hidden ? "comment.hide" : "comment.unhide", targetId: c.id, meta: { writeup: w.title } })),
  ]);
  revalidatePath(await pathFor(db, w));
  return { ok: hidden ? "Comment hidden." : "Comment restored." };
}
