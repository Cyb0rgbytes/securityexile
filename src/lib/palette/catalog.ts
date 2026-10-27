import "server-only";
import { getDict, localePath, type Lang } from "@/lib/i18n";
import { DISCORD_INVITE_URL } from "@/lib/links";
import { NAV } from "@/lib/site/nav";
import type { Command } from "./commands";

/**
 * Everything the palette can do, labelled in `lang`. Destinations only: actions that change
 * data need a server action and a confirmation, which doesn't belong behind a fuzzy search box.
 * Member-only pages are listed for everyone — they bounce to sign-in on their own, and
 * hiding them would mean shipping auth state into this bundle.
 *
 * Server-only: the root layout passes the result to the palette, so neither dictionary is
 * bundled for the client. Arabic commands keep the English label as a keyword, so typing
 * "teams" still works on an Arabic page.
 */
export function commandsFor(lang: Lang): Command[] {
  const t = getDict(lang).chrome;
  const en = getDict("en").chrome;
  const kw = (english: string, extra = "") => [lang === "en" ? "" : english.toLowerCase(), extra].filter(Boolean).join(" ") || undefined;
  const { groups } = t.palette;
  return [
    ...NAV.map((n) => ({ id: `nav-${n.href}`, label: t.nav[n.id], href: n.href, group: groups.go, keywords: kw(en.nav[n.id]) })),
    { id: "write", label: t.palette.write, href: "/writeups/new", group: groups.write, keywords: kw(en.palette.write, "new draft publish post create") },
    { id: "my-writeups", label: t.palette.myWriteups, href: "/me/writeups", group: groups.write, keywords: kw(en.palette.myWriteups, "drafts mine profile") },
    { id: "discord", label: t.palette.discord, href: DISCORD_INVITE_URL, group: groups.community, keywords: kw(en.palette.discord, "chat community help"), external: true },
    { id: "terms", label: t.palette.terms, href: localePath(lang, "/terms"), group: groups.community, keywords: kw(en.palette.terms, "rules legal aup") },
    { id: "privacy", label: t.palette.privacy, href: localePath(lang, "/privacy"), group: groups.community, keywords: kw(en.palette.privacy, "legal data gdpr") },
  ];
}
