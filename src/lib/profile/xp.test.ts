import { describe, expect, it } from "vitest";
import { RANK_TIERS } from "@/lib/db/enums";
import { RANK_FLOOR, XP_FOR, rankFor, rosterDelta, toNextTier, xpFor } from "./xp";

describe("xpFor", () => {
  it("pays for published writeups and events played", () => {
    expect(xpFor({ writeups: 0, events: 0 })).toBe(0);
    expect(xpFor({ writeups: 1, events: 0 })).toBe(XP_FOR.publishedWriteup);
    expect(xpFor({ writeups: 2, events: 3 })).toBe(2 * XP_FOR.publishedWriteup + 3 * XP_FOR.eventPlayed);
  });
});

describe("RANK_FLOOR", () => {
  it("covers exactly the rank tiers, in order", () => {
    expect(RANK_FLOOR.map((r) => r.tier)).toEqual([...RANK_TIERS]);
  });
  it("ascends, starting at zero so every member has a tier", () => {
    expect(RANK_FLOOR[0].min).toBe(0);
    const mins = RANK_FLOOR.map((r) => r.min);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    expect(new Set(mins).size).toBe(mins.length);
  });
});

describe("rankFor", () => {
  it("promotes exactly at each floor", () => {
    for (const { tier, min } of RANK_FLOOR) {
      expect(rankFor(min)).toBe(tier);
      if (min > 0) expect(rankFor(min - 1)).not.toBe(tier);
    }
  });
  it("holds the top tier above the last floor", () => {
    const top = RANK_FLOOR[RANK_FLOOR.length - 1];
    expect(rankFor(top.min + 10_000)).toBe(top.tier);
  });
  it("a brand new member is an initiate", () => expect(rankFor(0)).toBe("initiate"));
});

describe("rosterDelta", () => {
  it("returns only those added or dropped", () => {
    expect(rosterDelta(["a", "b"], ["b", "c"]).sort()).toEqual(["a", "c"]);
  });
  it("is empty when the roster is unchanged, whatever the order", () => {
    expect(rosterDelta(["a", "b"], ["b", "a"])).toEqual([]);
  });
  it("handles registering and withdrawing entirely", () => {
    expect(rosterDelta([], ["a", "b"]).sort()).toEqual(["a", "b"]);
    expect(rosterDelta(["a", "b"], []).sort()).toEqual(["a", "b"]);
  });
  it("never repeats a member", () => {
    expect(rosterDelta(["a", "a"], ["b"]).sort()).toEqual(["a", "b"]);
  });
});

describe("toNextTier", () => {
  it("counts the gap to the next floor", () => {
    expect(toNextTier(0)).toEqual({ tier: RANK_FLOOR[1].tier, remaining: RANK_FLOOR[1].min });
    expect(toNextTier(RANK_FLOOR[1].min - 1)).toEqual({ tier: RANK_FLOOR[1].tier, remaining: 1 });
  });
  it("is null at the top", () => {
    expect(toNextTier(RANK_FLOOR[RANK_FLOOR.length - 1].min)).toBeNull();
  });
});
