import { describe, expect, it } from "vitest";
import { NAV } from "@/lib/site/nav";
import { COMMANDS, filterCommands } from "./commands";

describe("COMMANDS", () => {
  it("includes every main nav destination", () => {
    for (const n of NAV) expect(COMMANDS.some((c) => c.href === n.href)).toBe(true);
  });
  it("has unique ids, so React keys and aria-activedescendant stay stable", () => {
    expect(new Set(COMMANDS.map((c) => c.id)).size).toBe(COMMANDS.length);
  });
  it("only marks off-site links external", () => {
    for (const c of COMMANDS) expect(c.external ?? false).toBe(!c.href.startsWith("/"));
  });
});

describe("filterCommands", () => {
  it("lists everything for an empty or blank query", () => {
    expect(filterCommands("")).toHaveLength(COMMANDS.length);
    expect(filterCommands("   ")).toHaveLength(COMMANDS.length);
  });
  it("matches on the label, case-insensitively", () => {
    expect(filterCommands("TEAMS").map((c) => c.label)).toContain("Teams");
  });
  it("matches on keywords that aren't in the label", () => {
    expect(filterCommands("aup").map((c) => c.href)).toContain("/terms");
  });
  it("requires every token to match, in any order", () => {
    expect(filterCommands("write new").map((c) => c.href)).toContain("/writeups/new");
    expect(filterCommands("new write").map((c) => c.href)).toContain("/writeups/new");
    expect(filterCommands("write nonsense")).toHaveLength(0);
  });
  it("returns nothing for a query that matches nothing", () => {
    expect(filterCommands("zzzzz")).toEqual([]);
  });
});
