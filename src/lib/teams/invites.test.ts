import { describe, expect, it } from "vitest";
import {
  ALPHABET,
  formatInviteCode,
  generateInviteCode,
  hashInviteCode,
  hashIp,
  maskedHint,
  normalizeInviteCode,
} from "./invites";

describe("generateInviteCode", () => {
  it("matches TEAM-XXXX-XXXX with Crockford characters only", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(/^TEAM-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    }
  });

  it("never emits ambiguous letters", () => {
    const all = Array.from({ length: 500 }, () => generateInviteCode()).join("");
    expect(all.replace(/^TEAM|TEAM/g, "")).not.toMatch(/[ILOU]/);
  });

  it("uses every alphabet symbol (no dead bits)", () => {
    const seen = new Set(Array.from({ length: 2000 }, () => generateInviteCode().slice(5).replace("-", "")).join(""));
    expect(seen.size).toBe(ALPHABET.length);
  });

  it("is deterministic for a given byte source", () => {
    const zeros = () => new Uint8Array(8);
    expect(generateInviteCode(zeros)).toBe("TEAM-0000-0000");
  });
});

describe("normalizeInviteCode", () => {
  it.each([
    ["TEAM-7F3K-Q9ZD", "7F3KQ9ZD"],
    ["team-7f3k-q9zd", "7F3KQ9ZD"],
    ["  TEAM 7F3K Q9ZD ", "7F3KQ9ZD"],
    ["7F3KQ9ZD", "7F3KQ9ZD"],
    ["7f3k-q9zd", "7F3KQ9ZD"],
    ["TEAM-7F3K-Q9ZO", "7F3KQ9Z0"], // O → 0
    ["TEAM-IF3K-Q9ZL", "1F3KQ9Z1"], // I, L → 1
  ])("%s → %s", (input, body) => {
    expect(normalizeInviteCode(input)).toBe(body);
  });

  it.each(["", "TEAM-7F3K", "TEAM-7F3K-Q9ZD-XX", "TEAM-7F3K-Q9U!", "TEAM-7F3K-Q9ZU", "'; drop table--"])(
    "rejects %j",
    (input) => {
      expect(normalizeInviteCode(input)).toBeNull();
    },
  );

  it("round-trips with formatInviteCode", () => {
    const code = generateInviteCode();
    expect(formatInviteCode(normalizeInviteCode(code)!)).toBe(code);
  });
});

describe("hashing", () => {
  it("is stable, hex, and depends on the pepper", async () => {
    const a = await hashInviteCode("7F3KQ9ZD", "pepper-1");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashInviteCode("7F3KQ9ZD", "pepper-1")).toBe(a);
    expect(await hashInviteCode("7F3KQ9ZD", "pepper-2")).not.toBe(a);
    expect(await hashInviteCode("7F3KQ9ZE", "pepper-1")).not.toBe(a);
  });

  it("separates invite and IP domains", async () => {
    expect(await hashIp("7F3KQ9ZD", "p")).not.toBe(await hashInviteCode("7F3KQ9ZD", "p"));
  });
});

describe("maskedHint", () => {
  it("reveals only the last two characters", () => {
    expect(maskedHint("7F3KQ9ZD")).toBe("TEAM-••••-••ZD");
  });
});
