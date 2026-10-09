import { describe, expect, it } from "vitest";
import { trendingScore } from "./ranking";

const H = 3_600_000;
describe("trendingScore", () => {
  it("is zero without votes", () => expect(trendingScore(0, new Date(0), 10 * H)).toBe(0));
  it("decays with age", () => expect(trendingScore(10, new Date(0), 2 * H)).toBeGreaterThan(trendingScore(10, new Date(0), 48 * H)));
  it("fresh 3 votes beat week-old 10 votes", () =>
    expect(trendingScore(3, new Date(100 * H), 101 * H)).toBeGreaterThan(trendingScore(10, new Date(0), 168 * H)));
});
