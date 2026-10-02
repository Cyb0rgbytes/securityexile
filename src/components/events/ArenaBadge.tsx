/** Marks events hosted on our own CTF arena (separate product, own subdomain). */
export const ARENA_HOST = "arena.securityexile.com";

export function isArenaUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).host === ARENA_HOST;
  } catch {
    return false;
  }
}

export function ArenaBadge() {
  return <span className="rounded border border-green/60 bg-green/10 px-2 py-0.5 font-mono text-xs text-green-bright">Security Exile Arena</span>;
}
