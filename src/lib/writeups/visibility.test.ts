import { describe, expect, it } from "vitest";
import { canRead, isLocked, spoilerFor } from "./visibility";

const NOW = 1_000_000;
const base = { authorId: "A", teamId: "T", publishedAt: new Date(1), hiddenAt: null, spoilerUntil: null };
const author = { userId: "A", teamId: "T", platformRole: "member" as const };
const mate = { userId: "B", teamId: "T", platformRole: "member" as const };
const outsider = { userId: "C", teamId: "X", platformRole: "member" as const };
const anon = { userId: null, teamId: null, platformRole: "member" as const };
const mod = { userId: "M", teamId: null, platformRole: "moderator" as const };

describe("canRead", () => {
  it("public: everyone", () => [author, mate, outsider, anon, mod].forEach((v) => expect(canRead(base, v, NOW)).toBe(true)));
  it("draft: author only", () => {
    const d = { ...base, publishedAt: null };
    expect(canRead(d, author, NOW)).toBe(true);
    [mate, outsider, anon, mod].forEach((v) => expect(canRead(d, v, NOW)).toBe(false));
  });
  it("hidden: author and staff only", () => {
    const h = { ...base, hiddenAt: new Date(1) };
    expect(canRead(h, author, NOW)).toBe(true);
    expect(canRead(h, mod, NOW)).toBe(true);
    [mate, outsider, anon].forEach((v) => expect(canRead(h, v, NOW)).toBe(false));
  });
  it("locked: author and team only", () => {
    const l = { ...base, spoilerUntil: new Date(NOW + 1) };
    expect(canRead(l, author, NOW)).toBe(true);
    expect(canRead(l, mate, NOW)).toBe(true);
    [outsider, anon, mod].forEach((v) => expect(canRead(l, v, NOW)).toBe(false));
  });
  it("locked without a team: author only", () => expect(canRead({ ...base, teamId: null, spoilerUntil: new Date(NOW + 1) }, mate, NOW)).toBe(false));
  it("unlocks exactly at the end", () => expect(canRead({ ...base, spoilerUntil: new Date(NOW) }, outsider, NOW)).toBe(true));
});

describe("isLocked / spoilerFor", () => {
  it("locked only before spoilerUntil", () => {
    expect(isLocked({ spoilerUntil: new Date(NOW + 1) }, NOW)).toBe(true);
    expect(isLocked({ spoilerUntil: null }, NOW)).toBe(false);
  });
  it("follows the event end", () => {
    expect(spoilerFor({ endsAt: new Date(5) })?.getTime()).toBe(5);
    expect(spoilerFor(null)).toBeNull();
  });
});
