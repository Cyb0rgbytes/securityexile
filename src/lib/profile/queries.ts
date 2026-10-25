import "server-only";
import { and, asc, desc, eq, gt, isNotNull, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { badges, seasons, userBadges, users } from "@/lib/db/schema";
import { BADGES, earnedBadges, type BadgeDef, type Contributions } from "./badges";
import type { Season } from "./seasons";
import { RANK_FLOOR, XP_FOR, xpFor, type RankTier } from "./xp";

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

export async function listSeasons(db: Db): Promise<Season[]> {
  return db.select().from(seasons).orderBy(desc(seasons.startsAt));
}

export type SeasonMember = { handle: string; displayName: string | null; xp: number; writeups: number; events: number };

/**
 * One season's board, recounted from the same rows as xpExpression() with the same rules
 * (published and not hidden; distinct events whose roster lists the member), restricted to
 * writeups published, and events starting, inside [startsAt, endsAt). Nothing is stored, so
 * a hide, delete or roster change shows up here on the next load, as it does all-time.
 */
export async function seasonStandings(db: Db, season: Pick<Season, "startsAt" | "endsAt">, limit = 50): Promise<SeasonMember[]> {
  const from = season.startsAt.getTime();
  const to = season.endsAt.getTime();
  const rows = await db.all<{ handle: string; displayName: string | null; writeups: number; events: number }>(sql`
    select u.handle as handle, u.display_name as displayName, sum(c.w) as writeups, sum(c.e) as events
    from (
      select w.author_id as uid, 1 as w, 0 as e from writeups w
        where w.published_at is not null and w.hidden_at is null and w.published_at >= ${from} and w.published_at < ${to}
      union all
      select played.uid, 0, 1 from (
        select distinct j.value as uid, er.event_id from event_registrations er
          join events e on e.id = er.event_id, json_each(er.roster_json) j
          where e.starts_at >= ${from} and e.starts_at < ${to}
      ) played
    ) c
    join users u on u.id = c.uid
    where u.handle is not null
    group by u.id
    order by sum(c.w) * ${XP_FOR.publishedWriteup} + sum(c.e) * ${XP_FOR.eventPlayed} desc, u.handle asc
    limit ${limit}`);
  return rows.map((r) => {
    const writeups = Number(r.writeups);
    const events = Number(r.events);
    return { handle: r.handle, displayName: r.displayName, writeups, events, xp: xpFor({ writeups, events }) };
  });
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

/**
 * Award one badge by slug, for the easter eggs, which aren't earned by counting.
 * Same conflict-free shape as awardBadges: redeeming twice is a no-op.
 * Returns false if the slug isn't in the catalogue, so a bad slug can't create a row.
 */
export async function awardSecret(db: Db, userId: string, slug: string): Promise<BadgeDef | null> {
  const def = BADGES.find((b) => b.slug === slug);
  if (!def) return null;
  await db.batch([
    db
      .insert(badges)
      .values({ id: def.slug, slug: def.slug, name: def.name, description: def.description, tier: def.tier ?? null, secret: def.secret ?? false })
      .onConflictDoNothing(),
    db.insert(userBadges).values({ userId, badgeId: def.slug }).onConflictDoNothing(),
  ]);
  return def;
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
