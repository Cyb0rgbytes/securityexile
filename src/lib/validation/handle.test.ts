import { describe, expect, it } from "vitest";
import { handleSchema } from "./handle";

const ok = (h: string) => handleSchema.safeParse(h);

describe("handleSchema", () => {
  it.each(["alice", "zero_cool", "acid-burn", "h4x0r", "abc", "a".repeat(20)])("accepts %s", (h) => {
    expect(ok(h).success).toBe(true);
  });

  it("normalizes case and whitespace", () => {
    expect(handleSchema.parse("  Alice  ")).toBe("alice");
  });

  it.each([
    ["ab", "too short"],
    ["a".repeat(21), "too long"],
    ["1337", "starts with a digit"],
    ["_ghost", "starts with underscore"],
    ["ghost-", "trailing hyphen"],
    ["gh--ost", "double hyphen"],
    ["gh_-ost", "mixed double separator"],
    ["ghøst", "non-ascii"],
    ["gh ost", "inner space"],
    ["<script>", "markup"],
    ["admin", "reserved route-ish"],
    ["sign-in", "reserved route"],
    ["whoami", "reserved command"],
    ["ROOT", "reserved after lowercasing"],
  ])("rejects %s (%s)", (h) => {
    expect(ok(h).success).toBe(false);
  });
});
