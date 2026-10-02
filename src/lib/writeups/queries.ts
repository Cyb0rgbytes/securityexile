import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { teams, users, writeupSeries, writeupTags, writeups } from "@/lib/db/schema";
import { trendingScore } from "./ranking";
import { listWhere, type Viewer } from "./visibility";

export type WriteupRow = typeof writeups.$inferSelect;
export type ListedWriteup = {
  id: string; slug: string; title: string; category: string | null; difficulty: string | null;
  voteCount: number; commentCount: number; publishedAt: Date | null; spoilerUntil: Date | null; bodyMd: string;
  authorHandle: string; teamTag: string | null; teamLogo: string | null; tags: string[];
};

export async function findWriteupById(db: Db, id: string) {
  return db.query.writeups.findFirst({ where: eq(writeups.id, id) });
}

export async function findWriteupByHandleSlug(db: Db, handle: string, slug: string) {
  const [row] = await db
    .select({ w: writeups, authorHandle: users.handle, authorAvatar: users.avatarUrl })
    .from(writeups)
    .innerJoin(users, eq(users.id, writeups.authorId))
    .where(and(eq(users.handle, handle.toLowerCase()), eq(writeups.slug, slug)))
    .limit(1);
  return row ? { w: row.w, authorHandle: row.authorHandle!, authorAvatar: row.authorAvatar } : undefined;
}

export async function tagsOf(db: Db, writeupId: string): Promise<string[]> {
  return (await db.select({ tag: writeupTags.tag }).from(writeupTags).where(eq(writeupTags.writeupId, writeupId))).map((r) => r.tag);
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listWriteups(
  db: Db,
  o: { viewer: Viewer; now: Date; tab: "trending" | "newest" | "top"; category?: string; difficulty?: string; tag?: string; q?: string; authorId?: string; eventId?: string; ids?: string[]; limit?: number },
): Promise<ListedWriteup[]> {
  const filters = [
    listWhere(o.viewer, o.now),
    o.category ? eq(writeups.category, o.category) : undefined,
    o.difficulty ? eq(writeups.difficulty, o.difficulty as WriteupRow["difficulty"] & string) : undefined,
    o.authorId ? eq(writeups.authorId, o.authorId) : undefined,
    o.eventId ? eq(writeups.eventId, o.eventId) : undefined,
    o.ids ? inArray(writeups.id, o.ids.length ? o.ids : ["-"]) : undefined,
    o.tag ? sql`exists (select 1 from ${writeupTags} where ${writeupTags.writeupId} = ${writeups.id} and ${writeupTags.tag} = ${o.tag})` : undefined,
    o.q ? sql`(${writeups.title} like ${`%${escapeLike(o.q)}%`} escape '\\' or exists (select 1 from ${writeupTags} where ${writeupTags.writeupId} = ${writeups.id} and ${writeupTags.tag} = ${o.q.toLowerCase()}))` : undefined,
  ];
  const limit = o.limit ?? 50;
  const rows = await db
    .select({
      id: writeups.id, slug: writeups.slug, title: writeups.title, category: writeups.category, difficulty: writeups.difficulty,
      voteCount: writeups.voteCount, commentCount: writeups.commentCount, publishedAt: writeups.publishedAt,
      spoilerUntil: writeups.spoilerUntil, bodyMd: writeups.bodyMd, authorHandle: users.handle, teamTag: teams.tag, teamLogo: teams.logoKey,
    })
    .from(writeups)
    .innerJoin(users, eq(users.id, writeups.authorId))
    .leftJoin(teams, eq(teams.id, writeups.teamId))
    .where(and(...filters))
    .orderBy(o.tab === "top" ? desc(writeups.voteCount) : desc(writeups.publishedAt))
    .limit(o.tab === "trending" ? 200 : limit);
  const now = o.now.getTime();
  const ordered = o.tab === "trending"
    ? rows.sort((a, b) => trendingScore(b.voteCount, b.publishedAt!, now) - trendingScore(a.voteCount, a.publishedAt!, now)).slice(0, limit)
    : rows;
  const ids = ordered.map((r) => r.id);
  const tagRows = ids.length ? await db.select().from(writeupTags).where(inArray(writeupTags.writeupId, ids)) : [];
  return ordered.map((r) => ({ ...r, authorHandle: r.authorHandle!, tags: tagRows.filter((t) => t.writeupId === r.id).map((t) => t.tag) }));
}

export async function listMyWriteups(db: Db, authorId: string) {
  return db.query.writeups.findMany({ where: eq(writeups.authorId, authorId), orderBy: desc(writeups.updatedAt), limit: 200 });
}

export async function listSeriesOf(db: Db, authorId: string) {
  return db.select({ id: writeupSeries.id, title: writeupSeries.title, slug: writeupSeries.slug }).from(writeupSeries).where(eq(writeupSeries.authorId, authorId)).orderBy(asc(writeupSeries.title));
}
