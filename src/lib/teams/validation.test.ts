import { describe, expect, it } from "vitest";
import { createInviteSchema, createTeamSchema, emblemFromKey, teamNameSchema, teamTagSchema } from "./validation";

describe("teamTagSchema", () => {
  it.each(["AB", "abc", "H4X0R", "  zx9 "])("accepts %j", (t) => {
    expect(teamTagSchema.safeParse(t).success).toBe(true);
  });
  it("uppercases", () => expect(teamTagSchema.parse("h4x")).toBe("H4X"));
  it.each(["A", "TOOLNG", "A-B", "ÄB", "<b>", ""])("rejects %j", (t) => {
    expect(teamTagSchema.safeParse(t).success).toBe(false);
  });
});

describe("teamNameSchema", () => {
  it.each(["Null Pointers", "0xDEADBEEF", "team.exe", "Les Hackeurs", "فريق الصقر"])("accepts %j", (n) => {
    expect(teamNameSchema.safeParse(n).success).toBe(true);
  });
  it("collapses whitespace", () => expect(teamNameSchema.parse("  Null   Pointers ")).toBe("Null Pointers"));
  it.each(["ab", "x".repeat(33), "-leading", "<script>", "a\u0000b", "emoji 🚩"])("rejects %j", (n) => {
    expect(teamNameSchema.safeParse(n).success).toBe(false);
  });
});

describe("createTeamSchema", () => {
  const base = { name: "Null Pointers", tag: "np", bio: "", focus: ["web", "web", "pwn"], joinMode: "open", emblem: "owl" };
  it("parses and dedupes focus", () => {
    const r = createTeamSchema.parse(base);
    expect(r.tag).toBe("NP");
    expect(r.focus).toEqual(["web", "pwn"]);
  });
  it("rejects unknown focus, mode and emblem", () => {
    expect(createTeamSchema.safeParse({ ...base, focus: ["blockchain"] }).success).toBe(false);
    expect(createTeamSchema.safeParse({ ...base, joinMode: "public" }).success).toBe(false);
    expect(createTeamSchema.safeParse({ ...base, emblem: "dragon" }).success).toBe(false);
  });
});

describe("createInviteSchema", () => {
  it("treats empty max uses as unlimited", () => {
    expect(createInviteSchema.parse({ kind: "private", expiry: "7d", maxUses: "" }).maxUses).toBeNull();
  });
  it("coerces and bounds max uses", () => {
    expect(createInviteSchema.parse({ kind: "public", expiry: "never", maxUses: "5" }).maxUses).toBe(5);
    expect(createInviteSchema.safeParse({ kind: "private", expiry: "7d", maxUses: "0" }).success).toBe(false);
    expect(createInviteSchema.safeParse({ kind: "private", expiry: "1y", maxUses: "" }).success).toBe(false);
  });
});

describe("emblemFromKey", () => {
  it("reads known emblems and falls back to falcon", () => {
    expect(emblemFromKey("emblem:kraken")).toBe("kraken");
    expect(emblemFromKey("emblem:../../etc/passwd")).toBe("falcon");
    expect(emblemFromKey(null)).toBe("falcon");
  });
});
