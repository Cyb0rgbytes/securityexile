import { drizzle } from "drizzle-orm/sqlite-proxy";
import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { chunk, listWriteups } from "./queries";
import { readMinutesFromChars } from "./render";

/** Records every statement instead of running it (D1 behaviour isn't needed for these checks). */
function recordingDb() {
  const calls: { sql: string; params: unknown[] }[] = [];
  const db = drizzle(
    async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
    { schema },
  ) as unknown as Db;
  return { db, calls };
}

const viewer = { userId: "U", teamId: "T", platformRole: "member" as const };

describe("listWriteups stays inside D1 limits", () => {
  it("bookmarks list binds far fewer than 100 parameters", async () => {
    const { db, calls } = recordingDb();
    await listWriteups(db, { viewer, now: new Date(0), tab: "newest", bookmarkedBy: "U", limit: 500 });
    expect(calls[0].sql).toMatch(/from "bookmarks"/);
    expect(Math.max(...calls.map((c) => c.params.length))).toBeLessThan(100);
  });
  it("list queries never fetch full writeup bodies", async () => {
    const { db, calls } = recordingDb();
    await listWriteups(db, { viewer, now: new Date(0), tab: "trending" });
    expect(calls[0].sql).not.toMatch(/"body_md"(?!\))/);
  });
});

describe("chunk", () => {
  it("splits into groups of at most n", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 90)).toEqual([]);
  });
});

describe("readMinutesFromChars", () => {
  it("estimates from length (≈6 chars per word, 200 wpm)", () => {
    expect(readMinutesFromChars(10)).toBe(1);
    expect(readMinutesFromChars(6000)).toBe(5);
  });
});
