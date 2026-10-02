import { describe, expect, it } from "vitest";
import { hit, LIMITS, type KVLike } from "./rate-limit";

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
    for (let i = 0; i < 5; i++) results.push(await hit(kv, "u1", limit, T0 + i));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, false]);
    expect(results[2].remaining).toBe(0);
  });

  it("keys are independent", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 3; i++) await hit(kv, "u1", limit, T0);
    expect((await hit(kv, "u2", limit, T0)).ok).toBe(true);
  });

  it("resets in the next window", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 4; i++) await hit(kv, "u1", limit, T0);
    expect((await hit(kv, "u1", limit, T0 + 600_000)).ok).toBe(true);
  });

  it("reports retryAfter and never sets a TTL under 60s", async () => {
    const kv = fakeKV();
    const r = await hit(kv, "u1", limit, T0 + 590_000);
    expect(r.retryAfter).toBe(10);
    expect([...kv.store.values()][0].ttl).toBeGreaterThanOrEqual(60);
  });
});

describe("Phase 4 limits", () => {
  it("match the spec", () => {
    expect(LIMITS.eventCreate).toEqual({ max: 3, windowSec: 86_400 });
    expect(LIMITS.challengeCreate).toEqual({ max: 60, windowSec: 3600 });
    expect(LIMITS.warRoomWrite).toEqual({ max: 300, windowSec: 3600 });
  });
});
