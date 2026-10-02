import { describe, expect, it } from "vitest";
import { parseTags, writeupInputSchema } from "./validation";

describe("parseTags", () => {
  it("normalizes and dedupes", () => expect(parseTags("SQLi, web ,sqli")).toEqual(["sqli", "web"]));
  it("rejects bad characters", () => expect(parseTags("ok, bad tag!")).toHaveProperty("error"));
  it("caps at five", () => expect(parseTags("aa,bb,cc,dd,ee,ff")).toHaveProperty("error"));
  it("allows empty", () => expect(parseTags("  ")).toEqual([]));
});

describe("writeupInputSchema", () => {
  const ok = { title: "SQLi 101", bodyMd: "body", category: "web", difficulty: "beginner", tags: [], eventId: "", seriesId: "", seriesTitle: "", seriesOrder: "", asTeam: "" };
  it("accepts a valid writeup", () => expect(writeupInputSchema.safeParse(ok).success).toBe(true));
  it("rejects a 2-char title", () => expect(writeupInputSchema.safeParse({ ...ok, title: "ab" }).success).toBe(false));
  it("rejects a 100k+ body", () => expect(writeupInputSchema.safeParse({ ...ok, bodyMd: "x".repeat(100_001) }).success).toBe(false));
  it("allows empty category/difficulty", () => expect(writeupInputSchema.safeParse({ ...ok, category: "", difficulty: "" }).success).toBe(true));
  it("rejects an unknown difficulty", () => expect(writeupInputSchema.safeParse({ ...ok, difficulty: "nightmare" }).success).toBe(false));
  it("parses series order and team flag", () => {
    const d = writeupInputSchema.parse({ ...ok, seriesOrder: "2", asTeam: "on" });
    expect(d.seriesOrder).toBe(2);
    expect(d.asTeam).toBe(true);
  });
});
