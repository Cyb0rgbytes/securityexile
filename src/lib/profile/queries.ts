import "server-only";
import { and, asc, desc, eq, gt, isNotNull, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { badges, userBadges, users } from "@/lib/db/schema";
import { BADGES, earnedBadges, type BadgeDef, type Contributions } from "./badges";
import { RANK_FLOOR, XP_FOR, type RankTier } from "./xp";

export type RankedMember = { handle: string; displayName: string | null; avatarUrl: string | null; xp: number; rankTier: RankTier };

/**
 * The leaderboard: members who have earned something, best first. Members without a handle
 * haven't finished onboarding, and nobody on zero is ranked, so the board starts empty rather
 * than listing every sign-up. Ties break on handle so the order is stable between loads.
 */
export async function topMembers(db: Db, limit = 50): Promise<RankedMember[]> {
  return db
    .select({ handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl, xp: users.xp, rankTier: users.rankTier })
    .from(users)
    .where(and(isNotNull(users.handle), gt(users.xp, 0)))
    .orderBy(desc(users.xp), asc(users.handle))
    .limit(limit) as Promise<RankedMember[]>;
}

/** What a member has contributed, counted exactly the way the XP recount counts it. */
export async function contributionCounts(db: Db, userId: string): Promise<Contributions> {
  const [row] = await db
    .select({
      writeups: sql<number>`(select count(*) from writeups w
        where w.author_id = ${userId} and w.published_at is not null and w.hidden_at is null)`,
      events: sql<number>`(select count(distinct er.event_id) from event_registrations er, json_each(er.roster_json) j
        where j.value = ${userId})`,
    })
    .from(users)
    .where(eq(users.id, userId));
  return { writeups: Number(row?.writeups ?? 0), events: Number(row?.events ?? 0) };
}

/**
 * Give a member every badge their contributions have earned and they don't already hold.
 *
 * Runs after the batch that changed things, not inside it: it needs the counts as they are
 * *after* the write. That's safe because awarding is monotonic and conflict-free — both
 * inserts ignore conflicts, so a repeat or a race awards nothing twice. The catalogue row is
 * upserted alongside, which is why the slug doubles as the badge id: no seed step to forget.
 */
export async function awardBadges(db: Db, userId: string): Promise<BadgeDef[]> {
  const earned = earnedBadges(await contributionCounts(db, userId));
  if (earned.length === 0) return [];
  await db.batch([
    db
      .insert(badges)
      .values(earned.map((b) => ({ id: b.slug, slug: b.slug, name: b.name, description: b.description, tier: b.tier ?? null, secret: b.secret ?? false })))
      .onConflictDoNothing(),
    db.insert(userBadges).values(earned.map((b) => ({ userId, badgeId: b.slug }))).onConflictDoNothing(),
  ]);
  return earned;
}

export type HeldBadge = { slug: string; name: string; description: string | null; tier: string | null; awardedAt: Date };

/** A member's badges, newest first. Secret ones are only here once earned, so they're safe to show. */
export async function badgesOf(db: Db, userId: string): Promise<HeldBadge[]> {
  return db
    .select({ slug: badges.slug, name: badges.name, description: badges.description, tier: badges.tier, awardedAt: userBadges.awardedAt })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.awardedAt));
}

/** How many badges exist to be found, for "3 of 5" on a profile. Secret ones aren't counted. */
export const VISIBLE_BADGE_COUNT = BADGES.filter((b) => !b.secret).length;

/**
 * XP recomputed from scratch, mirroring xpFor():
 *  - writeups they authored that are published and not hidden;
 *  - distinct events whose roster lists them. Rosters are a JSON array on each team's
 *    registration, so this reads them with json_each rather than counting rows.
 */
function xpExpression(userId: string): SQL {
  return sql`
    (select count(*) from writeups w
       where w.author_id = ${userId} and w.published_at is not null and w.hidden_at is null) * ${XP_FOR.publishedWriteup}
    + (select count(distinct er.event_id) from event_registrations er, json_each(er.roster_json) j
       where j.value = ${userId}) * ${XP_FOR.eventPlayed}`;
}

/** The ladder as a CASE, built from RANK_FLOOR so the thresholds have a single definition. */
function tierExpression(): SQL {
  const above = [...RANK_FLOOR]
    .reverse()
    .filter((r) => r.min > 0)
    .map((r) => sql`when ${users.xp} >= ${r.min} then ${r.tier}`);
  return sql`case ${sql.join(above, sql` `)} else ${RANK_FLOOR[0].tier} end`;
}

/**
 * Recount one member's XP and rank. Spread into the same `db.batch([...])` as the change that
 * triggered it, after that change: the counters are recomputed from the tables, never incremented,
 * so a retry or a double submit can't drift them. The tier statement runs second and reads the
 * xp the first one just wrote.
 */
export function recountXp(db: Db, userId: string) {
  return [
    db.update(users).set({ xp: xpExpression(userId) }).where(eq(users.id, userId)),
    db.update(users).set({ rankTier: tierExpression() }).where(eq(users.id, userId)),
  ] as const;
}
