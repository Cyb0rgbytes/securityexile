import "server-only";
import { and, asc, desc, eq, gt, isNotNull, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
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
