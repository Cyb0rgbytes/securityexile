import { describe, expect, it } from "vitest";
import { hit, LIMITS, MAX_DRAFTS, retryMessage, type KVLike, type RateLimitBinding } from "./rate-limit";

function fakeKV(): KVLike & { store: Map<string, { v: string; ttl?: number }> } {
  const store = new Map<string, { v: string; ttl?: number }>();
  return {
    store,
    async get(k) {
      return store.get(k)?.v ?? null;
    },
    async put(k, v, o) {
      store.set(k, { v, ttl: o?.expirationTtl });
    },
  };
}

const limit = { max: 3, windowSec: 600 };
const T0 = 1_800_000_000_000; // aligned to a 10-minute boundary

describe("hit()", () => {
  it("allows up to max, then blocks", async () => {
    const kv = fakeKV();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hit({ KV: kv }, "u1", limit, T0 + i));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, false]);
    expect(results[2].remaining).toBe(0);
  });

  it("keys are independent", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 3; i++) await hit({ KV: kv }, "u1", limit, T0);
    expect((await hit({ KV: kv }, "u2", limit, T0)).ok).toBe(true);
  });

  it("resets in the next window", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 4; i++) await hit({ KV: kv }, "u1", limit, T0);
    expect((await hit({ KV: kv }, "u1", limit, T0 + 600_000)).ok).toBe(true);
  });

  it("reports retryAfter and never sets a TTL under 60s", async () => {
    const kv = fakeKV();
    const r = await hit({ KV: kv }, "u1", limit, T0 + 590_000);
    expect(r.retryAfter).toBe(10);
    expect([...kv.store.values()][0].ttl).toBeGreaterThanOrEqual(60);
  });
});

/** Atomic stand-in for a Workers Rate Limiting binding: allows `max` calls per key. */
function fakeBinding(max: number): RateLimitBinding & { calls: string[] } {
  const counts = new Map<string, number>();
  const calls: string[] = [];
  return {
    calls,
    async limit({ key }) {
      calls.push(key);
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { success: n <= max };
    },
  };
}

describe("burst guard", () => {
  it("blocks parallel requests the KV window would let through", async () => {
    // KV alone: every parallel call reads 0 before any write lands, so all pass.
    const kv = fakeKV();
    const RL_BURST = fakeBinding(2);
    const results = await Promise.all(Array.from({ length: 5 }, () => hit({ KV: kv, RL_BURST }, "u1", { max: 100, windowSec: 600 }, T0)));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.find((r) => !r.ok)?.retryAfter).toBe(10);
  });

  it("uses the strict binding for strict limits and the burst binding otherwise", async () => {
    const store = { KV: fakeKV(), RL_STRICT: fakeBinding(3), RL_BURST: fakeBinding(10) };
    await hit(store, "redeem", LIMITS.inviteRedeemUser, T0);
    await hit(store, "comment", LIMITS.comment, T0);
    expect(store.RL_STRICT.calls).toEqual(["redeem"]);
    expect(store.RL_BURST.calls).toEqual(["comment"]);
  });

  it("doesn't touch KV for a burst-blocked request", async () => {
    const kv = fakeKV();
    await hit({ KV: kv, RL_BURST: fakeBinding(0) }, "u1", limit, T0);
    expect(kv.store.size).toBe(0);
  });

  it("says seconds, not minutes, for a burst block", () => {
    expect(retryMessage({ ok: false, remaining: 0, retryAfter: 10 })).toMatch(/few seconds/);
  });
});

describe("Phase 4 limits", () => {
  it("match the spec", () => {
    expect(LIMITS.eventCreate).toEqual({ max: 3, windowSec: 86_400, strict: true });
    expect(LIMITS.challengeCreate).toEqual({ max: 60, windowSec: 3600 });
    expect(LIMITS.warRoomWrite).toEqual({ max: 300, windowSec: 3600 });
  });
});

describe("Phase 5 limits", () => {
  it("match the spec", () => {
    expect(LIMITS.writeupPublish).toEqual({ max: 5, windowSec: 86_400, strict: true });
    expect(LIMITS.voteBookmark).toEqual({ max: 60, windowSec: 3600 });
    expect(LIMITS.comment).toEqual({ max: 20, windowSec: 3600 });
    expect(LIMITS.upload).toEqual({ max: 20, windowSec: 3600 });
    expect(LIMITS.preview).toEqual({ max: 120, windowSec: 3600 });
  });
});

describe("writeup save limits", () => {
  it("cap saves per hour and drafts per member", () => {
    expect(LIMITS.writeupSave).toEqual({ max: 120, windowSec: 3600 });
    expect(MAX_DRAFTS).toBe(200);
  });
});
