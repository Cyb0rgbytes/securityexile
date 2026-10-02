/**
 * Fixed-window rate limiter on Cloudflare KV.
 *
 * KV is eventually consistent (writes can take up to ~60s to be seen in
 * other regions) and has no atomic increment, so a determined attacker
 * spread across regions can exceed a limit slightly. That's acceptable for
 * coarse abuse limits; anything that must be exact lives in D1 instead
 * (e.g. invite max_uses is enforced by an atomic UPDATE, not here).
 */

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Limit {
  /** max events per window */
  max: number;
  /** window length in seconds (KV TTLs must be >= 60) */
  windowSec: number;
}

export const LIMITS = {
  inviteRedeemUser: { max: 5, windowSec: 600 },
  inviteRedeemIp: { max: 20, windowSec: 600 },
  teamCreate: { max: 3, windowSec: 86_400 },
  joinRequest: { max: 10, windowSec: 86_400 },
  eventCreate: { max: 3, windowSec: 86_400 },
  challengeCreate: { max: 60, windowSec: 3600 },
  warRoomWrite: { max: 300, windowSec: 3600 },
  writeupPublish: { max: 5, windowSec: 86_400 },
  voteBookmark: { max: 60, windowSec: 3600 },
  comment: { max: 20, windowSec: 3600 },
  upload: { max: 20, windowSec: 3600 },
  preview: { max: 120, windowSec: 3600 },
  writeupSave: { max: 120, windowSec: 3600 },
} as const satisfies Record<string, Limit>;

/** Unpublished writeups a member may keep (each row can be up to ~2 MB with its rendered HTML). */
export const MAX_DRAFTS = 200;

export interface RateResult {
  ok: boolean;
  remaining: number;
  /** seconds until the current window resets */
  retryAfter: number;
}

/**
 * Counts one event against `key` and reports whether it was within the limit.
 * Blocked attempts still count, so hammering doesn't reset anything.
 */
export async function hit(kv: KVLike, key: string, limit: Limit, now = Date.now()): Promise<RateResult> {
  const windowMs = limit.windowSec * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const k = `rl:${key}:${windowStart}`;
  const count = Number((await kv.get(k)) ?? 0) + 1;
  // TTL covers the rest of the window (+ slack); KV minimum TTL is 60s.
  const ttl = Math.max(60, Math.ceil((windowStart + windowMs - now) / 1000) + 5);
  await kv.put(k, String(count), { expirationTtl: ttl });
  return {
    ok: count <= limit.max,
    remaining: Math.max(0, limit.max - count),
    retryAfter: Math.ceil((windowStart + windowMs - now) / 1000),
  };
}

/** Human message for a blocked action. */
export function retryMessage(r: RateResult): string {
  const mins = Math.ceil(r.retryAfter / 60);
  return mins >= 120 ? `Too many attempts. Try again in about ${Math.ceil(mins / 60)} hours.` : `Too many attempts. Try again in ${mins} min.`;
}
