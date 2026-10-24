import { RANK_TIERS } from "@/lib/db/enums";

export type RankTier = (typeof RANK_TIERS)[number];

/**
 * What contribution is worth. Authorship and showing up only: upvotes are excluded so XP can't be
 * traded between accounts, and hearts are appreciation rather than ranking (see schema.ts).
 */
export const XP_FOR = { publishedWriteup: 50, eventPlayed: 25 } as const;

/** Lowest XP in each tier, in RANK_TIERS order. The SQL recount derives its CASE from this. */
export const RANK_FLOOR: readonly { tier: RankTier; min: number }[] = [
  { tier: "initiate", min: 0 },
  { tier: "operator", min: 100 },
  { tier: "specialist", min: 300 },
  { tier: "elite", min: 700 },
  { tier: "legend", min: 1500 },
];

/** Total XP for a member's contributions. Pure: the DB recount mirrors this arithmetic. */
export function xpFor(c: { writeups: number; events: number }): number {
  return c.writeups * XP_FOR.publishedWriteup + c.events * XP_FOR.eventPlayed;
}

/** The tier an XP total earns. */
export function rankFor(xp: number): RankTier {
  let tier: RankTier = RANK_FLOOR[0].tier;
  for (const r of RANK_FLOOR) if (xp >= r.min) tier = r.tier;
  return tier;
}

/**
 * Members whose participation actually changed between two rosters, so a roster edit only
 * recounts those added or dropped rather than everyone on the team.
 */
export function rosterDelta(before: readonly string[], after: readonly string[]): string[] {
  const kept = new Set(before.filter((id) => after.includes(id)));
  return [...new Set([...before, ...after])].filter((id) => !kept.has(id));
}

/** How much more XP the next tier needs, or null once there's nothing above. */
export function toNextTier(xp: number): { tier: RankTier; remaining: number } | null {
  const next = RANK_FLOOR.find((r) => xp < r.min);
  return next ? { tier: next.tier, remaining: next.min - xp } : null;
}
