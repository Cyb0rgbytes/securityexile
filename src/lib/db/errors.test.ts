import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./errors";

const d1 = (msg: string) => new Error(msg);
const wrapped = (inner: Error) => Object.assign(new Error("Failed query: insert into \"challenges\" …"), { cause: Object.assign(new Error(`D1_ERROR: ${inner.message}`), { cause: inner }) });

describe("isUniqueViolation", () => {
  const uq = d1("UNIQUE constraint failed: index 'challenges_name_uq': SQLITE_CONSTRAINT");
  it("finds UNIQUE in a Drizzle-wrapped error's cause chain", () => expect(isUniqueViolation(wrapped(uq))).toBe(true));
  it("matches a specific index or column", () => {
    expect(isUniqueViolation(wrapped(uq), "challenges_name_uq")).toBe(true);
    expect(isUniqueViolation(wrapped(d1("UNIQUE constraint failed: teams.tag")), "teams.tag")).toBe(true);
    expect(isUniqueViolation(wrapped(d1("UNIQUE constraint failed: teams.tag")), "teams.name")).toBe(false);
  });
  it("ignores other errors", () => {
    expect(isUniqueViolation(wrapped(d1("FOREIGN KEY constraint failed")))).toBe(false);
    expect(isUniqueViolation("nope")).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
  it("still works on an unwrapped error", () => expect(isUniqueViolation(uq)).toBe(true));
});
