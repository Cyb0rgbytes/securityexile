/** What a member has done, as counted by contributionCounts(). */
export type Contributions = { writeups: number; events: number };

export type BadgeDef = {
  /** Also the row id in `badges`, so the catalogue seeds itself deterministically. */
  slug: string;
  name: string;
  description: string;
  tier?: "bronze" | "silver" | "gold";
  /** Hidden from the catalogue until earned. Awarded by their own trigger, not by counting. */
  secret?: boolean;
  /** Earned once this is true. Omitted for secret badges, which aren't count-based. */
  earned?: (c: Contributions) => boolean;
};

/**
 * The badge catalogue. Code is the source of truth: rows in `badges` are upserted from this
 * list when a badge is first awarded, so there is no seed step to forget.
 *
 * Badges are permanent once earned, unlike XP, which is recounted and can go down. An
 * achievement records that you did the thing, and deleting the writeup afterwards doesn't
 * undo having done it.
 */
export const BADGES: BadgeDef[] = [
  {
    slug: "first-writeup",
    name: "First light",
    description: "Published your first writeup.",
    tier: "bronze",
    earned: (c) => c.writeups >= 1,
  },
  {
    slug: "writeups-5",
    name: "Field notes",
    description: "Published five writeups.",
    tier: "silver",
    earned: (c) => c.writeups >= 5,
  },
  {
    slug: "writeups-25",
    name: "Archivist",
    description: "Published twenty-five writeups.",
    tier: "gold",
    earned: (c) => c.writeups >= 25,
  },
  {
    slug: "first-event",
    name: "Showed up",
    description: "Played your first event.",
    tier: "bronze",
    earned: (c) => c.events >= 1,
  },
  {
    slug: "events-5",
    name: "Regular",
    description: "Played five events.",
    tier: "silver",
    earned: (c) => c.events >= 5,
  },
  // Easter eggs. Found, not earned: the phrase that unlocks each one is mapped server-side in
  // secrets.ts, so the answers are never in the client bundle.
  {
    slug: "wiretap",
    name: "Wiretap",
    description: "Read the response headers and found what was hidden in them.",
    secret: true,
  },
  {
    slug: "scout",
    name: "Scout",
    description: "Went looking where there was supposed to be nothing.",
    secret: true,
  },
];

/** Phrases are compared loosely: case, surrounding space and inner runs of space don't matter. */
export function normalizePhrase(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Badges a member's contributions have earned. Secret badges never come from counting. */
export function earnedBadges(c: Contributions): BadgeDef[] {
  return BADGES.filter((b) => !b.secret && b.earned?.(c));
}

/** Look up a definition, for awarding a secret badge by slug. */
export function badgeBySlug(slug: string): BadgeDef | undefined {
  return BADGES.find((b) => b.slug === slug);
}
