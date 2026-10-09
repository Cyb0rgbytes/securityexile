/**
 * Two-layer rate limiter.
 *
 * 1. Burst guard: Cloudflare's Workers Rate Limiting binding (RL_STRICT / RL_BURST
 *    in wrangler.jsonc). It is atomic per location, so a burst of parallel
 *    requests can't all read the same count and slip through together.
 * 2. Window: a fixed-window counter on Cloudflare KV for the long windows
 *    (minutes to a day) the binding can't express (its period is 10s or 60s).
 *
 * KV is eventually consistent (writes can take up to ~60s to be seen in
 * other regions) and has no atomic increment, so a determined attacker spread
 * across regions can still exceed a window slightly; the burst guard caps how
 * fast. Anything that must be exact lives in D1 instead (e.g. invite max_uses is
 * enforced by an atomic UPDATE, the upload quota by a conditional INSERT).
 */

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/** Shape of a Workers Rate Limiting binding. */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Where counts live. The bindings are optional so unit tests and older local
 * runtimes without them still get the KV window.
 */
export interface RateStore {
  KV: KVLike;
  RL_STRICT?: RateLimitBinding;
  RL_BURST?: RateLimitBinding;
}

export interface Limit {
  /** max events per window */
  max: number;
  /** window length in seconds (KV TTLs must be >= 60) */
  windowSec: number;
  /** use the tighter burst guard (3 per 10s instead of 10 per 10s) */
  strict?: true;
}

/** Period of both burst-guard bindings, in seconds (wrangler.jsonc `simple.period`). */
const BURST_PERIOD_SEC = 10;

export const LIMITS = {
  inviteRedeemUser: { max: 5, windowSec: 600, strict: true },
  inviteRedeemIp: { max: 20, windowSec: 600, strict: true },
  teamCreate: { max: 3, windowSec: 86_400, strict: true },
  joinRequest: { max: 10, windowSec: 86_400, strict: true },
  eventCreate: { max: 3, windowSec: 86_400, strict: true },
  challengeCreate: { max: 60, windowSec: 3600 },
  warRoomWrite: { max: 300, windowSec: 3600 },
  writeupPublish: { max: 5, windowSec: 86_400, strict: true },
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
export async function hit(store: RateStore, key: string, limit: Limit, now = Date.now()): Promise<RateResult> {
  const burst = limit.strict ? store.RL_STRICT : store.RL_BURST;
  if (burst && !(await burst.limit({ key })).success) return { ok: false, remaining: 0, retryAfter: BURST_PERIOD_SEC };

  const windowMs = limit.windowSec * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const k = `rl:${key}:${windowStart}`;
  const count = Number((await store.KV.get(k)) ?? 0) + 1;
  // TTL covers the rest of the window (+ slack); KV minimum TTL is 60s.
  const ttl = Math.max(60, Math.ceil((windowStart + windowMs - now) / 1000) + 5);
  await store.KV.put(k, String(count), { expirationTtl: ttl });
  return {
    ok: count <= limit.max,
    remaining: Math.max(0, limit.max - count),
    retryAfter: Math.ceil((windowStart + windowMs - now) / 1000),
  };
}

/** Human message for a blocked action. */
export function retryMessage(r: RateResult): string {
  if (r.retryAfter < 60) return "Too many attempts. Slow down and try again in a few seconds.";
  const mins = Math.ceil(r.retryAfter / 60);
  return mins >= 120 ? `Too many attempts. Try again in about ${Math.ceil(mins / 60)} hours.` : `Too many attempts. Try again in ${mins} min.`;
}
