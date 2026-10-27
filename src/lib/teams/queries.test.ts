import { drizzle } from "drizzle-orm/sqlite-proxy";
import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { topTeams } from "./queries";

/** Records every statement instead of running it, returning the canned rows. */
function recordingDb(rows: unknown[][] = []) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const db = drizzle(
    async (sql, params) => {
      calls.push({ sql, params });
      return { rows };
    },
    { schema },
  ) as unknown as Db;
  return { db, calls };
}

describe("topTeams", () => {
  it("ranks by the members' stored XP, leaving out teams on zero", async () => {
    const { db, calls } = recordingDb();
    await topTeams(db, 10);
    const q = calls[0].sql;
    expect(q).toMatch(/sum\("users"\."xp"\)/);
    expect(q).toMatch(/inner join "team_members"/);
    expect(q).toMatch(/having coalesce\(sum\("users"\."xp"\), 0\) > 0/);
    expect(q).toMatch(/order by coalesce\(sum\("users"\."xp"\), 0\) desc, "teams"\."name" asc/);
    expect(calls[0].params).toContain(10);
  });
  it("returns xp as a number even when the driver hands back a string", async () => {
    const { db } = recordingDb([["SE", "Shinobi", null, 3, "125"]]);
    expect(await topTeams(db)).toEqual([{ tag: "SE", name: "Shinobi", logoKey: null, members: 3, xp: 125 }]);
  });
});
