import { describe, expect, it } from "vitest";
import { challengeInputSchema, eventInputSchema, parseInstant, parseLinks, slugify, validateWindow } from "./validation";

const H = 3_600_000;

describe("slugify", () => {
  it("lowercases and dashes", () => expect(slugify("DEF CON Quals 2026!")).toBe("def-con-quals-2026"));
  it("trims dashes and caps length", () => expect(slugify("--" + "a".repeat(100) + "--")).toBe("a".repeat(60)));
  it("falls back when nothing usable is left", () => expect(slugify("!!!")).toBe("event"));
  it("drops non-latin characters", () => expect(slugify("مسابقة CTF")).toBe("ctf"));
});

describe("parseInstant", () => {
  it("parses an ISO instant with offset", () => expect(parseInstant("2026-10-02T16:00:00.000Z")?.getTime()).toBe(Date.UTC(2026, 9, 2, 16)));
  it("keeps the instant a UTC+4 browser sent", () =>
    // browser in UTC+4 typed 20:00 → toISOString() gives 16:00Z
    expect(parseInstant(new Date("2026-10-02T20:00:00+04:00").toISOString())?.getUTCHours()).toBe(16));
  it("rejects garbage", () => expect(parseInstant("tomorrow")).toBeNull());
  it("rejects strings without a zone", () => expect(parseInstant("2026-10-02T20:00")).toBeNull());
});

describe("parseLinks", () => {
  it("accepts 'label | url' and bare urls", () =>
    expect(parseLinks("source | https://x.io/a\nhttps://y.io")).toEqual([
      { label: "source", url: "https://x.io/a" },
      { label: "y.io", url: "https://y.io" },
    ]));
  it("rejects javascript: urls", () => expect(parseLinks("x | javascript:alert(1)")).toHaveProperty("error"));
  it("rejects more than 10 links", () => expect(parseLinks(Array(11).fill("https://a.io").join("\n"))).toHaveProperty("error"));
  it("ignores blank lines", () => expect(parseLinks("\n\nhttps://a.io\n")).toEqual([{ label: "a.io", url: "https://a.io" }]));
});

describe("eventInputSchema", () => {
  const ok = { title: "Exile CTF", kind: "ctf", format: "jeopardy", url: "https://ctf.example", description: "", startsAt: "2030-01-01T00:00:00.000Z", endsAt: "2030-01-02T00:00:00.000Z" };
  it("accepts a valid event", () => expect(eventInputSchema.safeParse(ok).success).toBe(true));
  it("rejects a non-http url", () => expect(eventInputSchema.safeParse({ ...ok, url: "ftp://x" }).success).toBe(false));
  it("allows an empty url", () => expect(eventInputSchema.safeParse({ ...ok, url: "" }).success).toBe(true));
  it("rejects a short title", () => expect(eventInputSchema.safeParse({ ...ok, title: "ab" }).success).toBe(false));
  it("rejects an unknown kind", () => expect(eventInputSchema.safeParse({ ...ok, kind: "party" }).success).toBe(false));
});

describe("validateWindow", () => {
  const now = 100 * H;
  it("needs end after start", () => expect(validateWindow(new Date(200 * H), new Date(200 * H), now, true)).toMatch(/after/));
  it("needs a future start for new events", () => expect(validateWindow(new Date(99 * H), new Date(120 * H), now, true)).toMatch(/future/));
  it("allows a past start when editing", () => expect(validateWindow(new Date(99 * H), new Date(120 * H), now, false)).toBeNull());
  it("caps length at 14 days", () => expect(validateWindow(new Date(200 * H), new Date(200 * H + 14 * 24 * H + 1), now, true)).toMatch(/14 days/));
});

describe("challengeInputSchema", () => {
  it("accepts a valid challenge", () => expect(challengeInputSchema.safeParse({ name: "baby-rop", category: "pwn", points: "250" }).data).toEqual({ name: "baby-rop", category: "pwn", points: 250 }));
  it("treats empty points as null", () => expect(challengeInputSchema.safeParse({ name: "x", category: "web", points: "" }).data?.points).toBeNull());
  it("rejects unknown categories", () => expect(challengeInputSchema.safeParse({ name: "x", category: "cooking", points: "" }).success).toBe(false));
  it("rejects points over 10000", () => expect(challengeInputSchema.safeParse({ name: "x", category: "web", points: "10001" }).success).toBe(false));
});
