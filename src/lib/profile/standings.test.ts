import { describe, expect, it } from "vitest";
import { withPlaces } from "./standings";

const places = (xps: number[]) => withPlaces(xps.map((xp) => ({ xp }))).map((r) => r.place);

describe("withPlaces", () => {
  it("numbers distinct totals 1..n", () => {
    expect(places([300, 200, 100])).toEqual([1, 2, 3]);
  });
  it("gives a tie one place and skips the places it used", () => {
    expect(places([300, 200, 200, 100])).toEqual([1, 2, 2, 4]);
    expect(places([50, 50, 50])).toEqual([1, 1, 1]);
  });
  it("keeps the rows and their order", () => {
    const rows = [
      { xp: 75, name: "b" },
      { xp: 75, name: "a" },
    ];
    expect(withPlaces(rows)).toEqual([
      { xp: 75, name: "b", place: 1 },
      { xp: 75, name: "a", place: 1 },
    ]);
  });
  it("handles an empty board", () => {
    expect(withPlaces([])).toEqual([]);
  });
});
