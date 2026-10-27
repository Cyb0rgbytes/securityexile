import { describe, expect, it } from "vitest";
import { currentSeason, pastAndLive, seasonStatus, type Season } from "./seasons";

const s = (id: string, start: number, end: number): Season => ({ id, name: id, startsAt: new Date(start), endsAt: new Date(end) });

describe("seasonStatus", () => {
  it("is half-open: live from the start up to, not including, the end", () => {
    const one = s("1", 100, 200);
    expect(seasonStatus(one, 99)).toBe("upcoming");
    expect(seasonStatus(one, 100)).toBe("live");
    expect(seasonStatus(one, 199)).toBe("live");
    expect(seasonStatus(one, 200)).toBe("ended");
  });
});

describe("currentSeason", () => {
  it("picks the live season", () => {
    expect(currentSeason([s("a", 0, 100), s("b", 100, 200), s("c", 200, 300)], 150)?.id).toBe("b");
  });
  it("hands over cleanly at a shared boundary", () => {
    expect(currentSeason([s("a", 0, 100), s("b", 100, 200)], 100)?.id).toBe("b");
  });
  it("prefers the later start if two overlap", () => {
    expect(currentSeason([s("long", 0, 1000), s("short", 500, 600)], 550)?.id).toBe("short");
  });
  it("is null between seasons or with none", () => {
    expect(currentSeason([s("a", 0, 100), s("b", 200, 300)], 150)).toBeNull();
    expect(currentSeason([], 0)).toBeNull();
  });
});

describe("pastAndLive", () => {
  it("lists started seasons newest first and hides upcoming ones", () => {
    const list = pastAndLive([s("a", 0, 100), s("c", 300, 400), s("b", 100, 200)], 150);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
