import { describe, expect, it } from "vitest";
import { NAV } from "@/lib/site/nav";
import { commandsFor } from "./catalog";
import { filterCommands } from "./commands";

const COMMANDS = commandsFor("en");
const AR = commandsFor("ar");

describe("commandsFor", () => {
  it("includes every main nav destination", () => {
    for (const n of NAV) expect(COMMANDS.some((c) => c.href === n.href)).toBe(true);
  });
  it("has unique ids, so React keys and aria-activedescendant stay stable", () => {
    expect(new Set(COMMANDS.map((c) => c.id)).size).toBe(COMMANDS.length);
  });
  it("only marks off-site links external", () => {
    for (const c of [...COMMANDS, ...AR]) expect(c.external ?? false).toBe(!c.href.startsWith("/"));
  });
  it("lists the same commands in Arabic, labelled in Arabic", () => {
    expect(AR.map((c) => c.id)).toEqual(COMMANDS.map((c) => c.id));
    expect(AR.find((c) => c.href === "/teams")?.label).toBe("الفرق");
  });
  it("sends Arabic readers to the Arabic policies, and only those", () => {
    expect(AR.map((c) => c.href)).toContain("/ar/terms");
    expect(AR.map((c) => c.href)).toContain("/ar/privacy");
    expect(AR.filter((c) => c.href.startsWith("/ar")).map((c) => c.id).sort()).toEqual(["privacy", "terms"]);
  });
});

describe("filterCommands", () => {
  it("lists everything for an empty or blank query", () => {
    expect(filterCommands("", COMMANDS)).toHaveLength(COMMANDS.length);
    expect(filterCommands("   ", COMMANDS)).toHaveLength(COMMANDS.length);
  });
  it("matches on the label, case-insensitively", () => {
    expect(filterCommands("TEAMS", COMMANDS).map((c) => c.label)).toContain("Teams");
  });
  it("matches on keywords that aren't in the label", () => {
    expect(filterCommands("aup", COMMANDS).map((c) => c.href)).toContain("/terms");
  });
  it("requires every token to match, in any order", () => {
    expect(filterCommands("write new", COMMANDS).map((c) => c.href)).toContain("/writeups/new");
    expect(filterCommands("new write", COMMANDS).map((c) => c.href)).toContain("/writeups/new");
    expect(filterCommands("write nonsense", COMMANDS)).toHaveLength(0);
  });
  it("returns nothing for a query that matches nothing", () => {
    expect(filterCommands("zzzzz", COMMANDS)).toEqual([]);
  });
  it("finds Arabic commands by their Arabic label and by the English words", () => {
    expect(filterCommands("الفرق", AR).map((c) => c.href)).toEqual(["/teams"]);
    expect(filterCommands("teams", AR).map((c) => c.href)).toEqual(["/teams"]);
    expect(filterCommands("aup", AR).map((c) => c.href)).toContain("/ar/terms");
  });
});
