/**
 * Main navigation. Shared by the header and the command palette so the two can't drift apart.
 * Labels come from the dictionary's `chrome.nav`, keyed by id, so Arabic pages get Arabic ones.
 */
export const NAV = [
  { id: "writeups", href: "/writeups" },
  { id: "teams", href: "/teams" },
  { id: "events", href: "/events" },
  { id: "ranks", href: "/leaderboard" },
] as const;

export type NavItem = { href: string; label: string };
