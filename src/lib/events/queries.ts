import "server-only";
import { and, asc, count, desc, eq, gt, isNull, lte, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { challenges, eventRegistrations, events, teams, users } from "@/lib/db/schema";

export type EventRow = typeof events.$inferSelect;

function boardQuery(db: Db, where: SQL | undefined) {
  return db
    .select({
      event: events,
      ownerTag: teams.tag,
      ownerLogo: teams.logoKey,
      teams: count(eventRegistrations.teamId),
    })
    .from(events)
    .leftJoin(teams, eq(teams.id, events.ownerTeamId))
    .leftJoin(eventRegistrations, eq(eventRegistrations.eventId, events.id))
    .where(where)
    .groupBy(events.id);
}

/**
 * Board rows: everything not yet over (soonest first), plus the 50 most recent past
 * events. Queried separately so old events can never crowd out new ones.
 * Phases are derived in the page with eventPhase().
 */
export async function listBoard(db: Db, opts: { includeHidden: boolean; now: number }) {
  const visible = opts.includeHidden ? undefined : isNull(events.hiddenAt);
  const now = new Date(opts.now);
  const [current, past] = await Promise.all([
    boardQuery(db, and(visible, gt(events.endsAt, now))).orderBy(asc(events.startsAt)).limit(200),
    boardQuery(db, and(visible, lte(events.endsAt, now))).orderBy(desc(events.endsAt)).limit(50),
  ]);
  return [...current, ...past];
}

export async function findEventBySlug(db: Db, slug: string) {
  return db.query.events.findFirst({ where: eq(events.slug, slug) });
}

export async function listRegisteredTeams(db: Db, eventId: string) {
  return db
    .select({ teamId: teams.id, tag: teams.tag, name: teams.name, logoKey: teams.logoKey, roster: eventRegistrations.roster })
    .from(eventRegistrations)
    .innerJoin(teams, eq(teams.id, eventRegistrations.teamId))
    .where(eq(eventRegistrations.eventId, eventId))
    .orderBy(asc(eventRegistrations.createdAt));
}

export async function findRegistration(db: Db, eventId: string, teamId: string) {
  return db.query.eventRegistrations.findFirst({
    where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.teamId, teamId)),
  });
}

/** War-room board for one team; claimer handle joined for display. */
export async function listChallenges(db: Db, eventId: string, teamId: string) {
  return db
    .select({ c: challenges, claimer: users.handle })
    .from(challenges)
    .leftJoin(users, eq(users.id, challenges.claimedBy))
    .where(and(eq(challenges.eventId, eventId), eq(challenges.teamId, teamId)))
    .orderBy(desc(challenges.updatedAt));
}
