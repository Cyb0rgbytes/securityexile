/** Marks events hosted on our own CTF arena (separate product on its own subdomain; see docs/DOMAINS.md). */
export const ARENA_HOSTS = ["ctf.securityexile.com", "arena.securityexile.com"]; // arena. = the earlier name, kept for old links

export function isArenaUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    return ARENA_HOSTS.includes(new URL(url).host);
  } catch {
    return false;
  }
}

export function ArenaBadge() {
  return <span className="rounded border border-green/60 bg-green/10 px-2 py-0.5 font-mono text-xs text-green-bright">Security Exile CTF</span>;
}
