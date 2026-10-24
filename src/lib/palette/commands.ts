import { DISCORD_INVITE_URL } from "@/lib/links";
import { NAV } from "@/lib/site/nav";

export type Command = {
  id: string;
  label: string;
  href: string;
  group: "Go" | "Write" | "Community";
  /** Extra words that should match this command but don't appear in the label. */
  keywords?: string;
  external?: boolean;
};

/**
 * Everything the palette can do. Destinations only: actions that change data need a
 * server action and a confirmation, which doesn't belong behind a fuzzy search box.
 * Member-only pages are listed for everyone — they bounce to sign-in on their own, and
 * hiding them would mean shipping auth state into this bundle.
 */
export const COMMANDS: Command[] = [
  ...NAV.map((n) => ({ id: `nav-${n.href}`, label: n.label, href: n.href, group: "Go" as const })),
  { id: "write", label: "Write a writeup", href: "/writeups/new", group: "Write", keywords: "new draft publish post create" },
  { id: "my-writeups", label: "My writeups", href: "/me/writeups", group: "Write", keywords: "drafts mine profile" },
  { id: "discord", label: "Join the Discord", href: DISCORD_INVITE_URL, group: "Community", keywords: "chat community help", external: true },
  { id: "terms", label: "Terms and acceptable use", href: "/terms", group: "Community", keywords: "rules legal aup" },
  { id: "privacy", label: "Privacy policy", href: "/privacy", group: "Community", keywords: "legal data gdpr" },
];

/**
 * Commands matching a query: every whitespace-separated token must appear somewhere in the
 * label or keywords. Token-wise rather than one substring, so "write new" finds "Write a
 * writeup". An empty query lists everything.
 */
export function filterCommands(query: string, all: Command[] = COMMANDS): Command[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return all;
  return all.filter((c) => {
    const haystack = `${c.label} ${c.keywords ?? ""}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}
