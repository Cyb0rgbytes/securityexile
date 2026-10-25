import { describe, expect, it } from "vitest";
import { growthTable, lastMonths, monthKey, monthStart } from "./growth";

describe("monthKey / monthStart", () => {
  it("buckets by UTC calendar month", () => {
    expect(monthKey(Date.UTC(2026, 0, 31, 23, 59))).toBe("2026-01");
    expect(monthKey(Date.UTC(2026, 1, 1))).toBe("2026-02");
    expect(monthStart("2026-02")).toBe(Date.UTC(2026, 1, 1));
  });
});

describe("lastMonths", () => {
  it("ends at the current month, oldest first", () => {
    expect(lastMonths(Date.UTC(2026, 9, 25), 3)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });
  it("crosses a year boundary", () => {
    expect(lastMonths(Date.UTC(2027, 0, 5), 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

describe("growthTable", () => {
  const months = ["2026-08", "2026-09", "2026-10"];
  const counts = { signups: { "2026-08": 4, "2026-10": 1 }, published: { "2026-09": 2 }, registrations: {} };

  it("fills missing months with zeros", () => {
    const rows = growthTable(months, counts, []);
    expect(rows.map((r) => [r.month, r.signups, r.published, r.registrations, r.active])).toEqual([
      ["2026-08", 4, 0, 0, 0],
      ["2026-09", 0, 2, 0, 0],
      ["2026-10", 1, 0, 0, 0],
    ]);
  });

  it("counts each member once per month, however much they did", () => {
    const rows = growthTable(months, counts, [
      { month: "2026-08", uid: "a" },
      { month: "2026-08", uid: "a" },
      { month: "2026-08", uid: "b" },
    ]);
    expect(rows[0].active).toBe(2);
  });

  it("retention is the share of last month's active members active again", () => {
    const rows = growthTable(months, counts, [
      { month: "2026-08", uid: "a" },
      { month: "2026-08", uid: "b" },
      { month: "2026-08", uid: "c" },
      { month: "2026-08", uid: "d" },
      { month: "2026-09", uid: "a" },
      { month: "2026-09", uid: "e" }, // new this month: not part of retention
    ]);
    expect(rows[0].retention).toBeNull(); // nothing before the window
    expect(rows[1].retention).toBe(0.25);
    expect(rows[2].retention).toBe(0);
  });

  it("has no retention after a month with nobody active", () => {
    expect(growthTable(months, counts, [{ month: "2026-09", uid: "a" }])[1].retention).toBeNull();
  });
});
