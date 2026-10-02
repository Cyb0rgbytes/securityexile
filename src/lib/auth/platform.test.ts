import { describe, expect, it } from "vitest";
import { isStaff } from "./platform";

describe("isStaff", () => {
  it("covers moderator and admin", () => {
    expect(isStaff("moderator")).toBe(true);
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("member")).toBe(false);
    expect(isStaff(null)).toBe(false);
  });
});
