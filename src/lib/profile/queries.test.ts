import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { contributionCounts, recountXp, seasonStandings } from "./queries";

/** The real migrations in an in-memory SQLite, so the XP SQL runs as written rather than being matched as text. */
function sqliteDb() {
  const raw = new DatabaseSync(":memory:");
  raw.exec("pragma foreign_keys = on");
  const dir = fileURLToPath(new URL("../../../drizzle/migrations/", import.meta.url));
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) raw.exec(readFileSync(dir + f, "utf8"));
  // Query builders expect array rows; raw `db.all(sql)` gets rows untouched, and D1 hands those back as objects.
  const mode = { objectRows: false };
  const db = drizzle(
    async (sql, params, method) => {
      const stmt = raw.prepare(sql);
      const args = params as (string | number | null)[];
      if (method === "run") return (stmt.run(...args), { rows: [] });
      // Column names are distinct in every query these tests run, so Object.values keeps them all.
      const shape = (r: unknown) => (mode.objectRows || !r ? r : Object.values(r as object));
      if (method === "get") return { rows: (shape(stmt.get(...args)) as unknown[] | undefined) ?? [] };
      return { rows: stmt.all(...args).map(shape) as unknown[][] };
    },
    { schema },
  ) as unknown as Db;
  return { raw, db, mode };
}

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);

describe("event XP (countsAsPlayed)", () => {
  let raw: DatabaseSync;
  let db: Db;
  let mode: { objectRows: boolean };
  const xpOf = (id: string) => (raw.prepare("select xp from users where id = ?").get(id) as { xp: number }).xp;
  const recount = async (id: string) => {
    for (const q of recountXp(db, id)) await q;
  };
  const event = (id: string, by: string, ownerTeam: string | null, hidden = false) =>
    raw
      .prepare("insert into events (id, slug, title, starts_at, ends_at, created_by, owner_team_id, hidden_at, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, id, id, T0 + DAY, T0 + 2 * DAY, by, ownerTeam, hidden ? T0 : null, T0);
  const register = (eventId: string, teamId: string, roster: string[]) =>
    raw.prepare("insert into event_registrations (event_id, team_id, roster_json, created_at) values (?, ?, ?, ?)").run(eventId, teamId, JSON.stringify(roster), T0);

  beforeEach(() => {
    ({ raw, db, mode } = sqliteDb());
    for (const u of ["ana", "bo", "cy", "dee"])
      raw.prepare("insert into users (id, clerk_id, handle, created_at, updated_at) values (?, ?, ?, ?, ?)").run(u, `c-${u}`, u, T0, T0);
    // ana captains RED with bo; cy captains BLU; dee is on no team.
    for (const [id, by] of [["red", "ana"], ["blu", "cy"]])
      raw.prepare("insert into teams (id, name, tag, created_by, created_at) values (?, ?, ?, ?, ?)").run(id, id, id.toUpperCase(), by, T0);
    for (const [team, user, role] of [["red", "ana", "captain"], ["red", "bo", "member"], ["blu", "cy", "captain"]])
      raw.prepare("insert into team_members (team_id, user_id, role, joined_at) values (?, ?, ?, ?)").run(team, user, role, T0);
  });

  it("pays for another host's event", async () => {
    event("e1", "cy", "blu");
    register("e1", "red", ["ana", "bo"]);
    await recount("ana");
    expect(xpOf("ana")).toBe(25);
    expect(await contributionCounts(db, "bo")).toEqual({ writeups: 0, events: 1 });
  });

  it("pays nothing for a personal event its creator registers their own team for", async () => {
    event("e1", "ana", null);
    register("e1", "red", ["ana", "bo"]);
    await recount("ana");
    await recount("bo");
    expect([xpOf("ana"), xpOf("bo")]).toEqual([0, 0]);
  });

  it("pays nothing to the host team, or to the creator on someone else's roster", async () => {
    event("e1", "dee", "red"); // hosted as RED
    register("e1", "red", ["ana"]);
    event("e2", "dee", null); // dee's own event, dee somehow rostered
    register("e2", "blu", ["dee"]);
    await recount("ana");
    await recount("dee");
    expect([xpOf("ana"), xpOf("dee")]).toEqual([0, 0]);
  });

  it("pays nothing for a hidden event", async () => {
    event("e1", "cy", "blu", true);
    register("e1", "red", ["ana"]);
    await recount("ana");
    expect(xpOf("ana")).toBe(0);
  });

  it("takes the XP back when a recount runs after the event is deleted", async () => {
    event("e1", "cy", "blu");
    register("e1", "red", ["ana"]);
    await recount("ana");
    expect(xpOf("ana")).toBe(25);
    raw.prepare("delete from events where id = ?").run("e1"); // cascades the registration
    await recount("ana");
    expect(xpOf("ana")).toBe(0);
  });

  it("applies the same rule to season boards", async () => {
    event("e1", "cy", "blu");
    register("e1", "red", ["ana"]);
    event("e2", "ana", null);
    register("e2", "red", ["bo"]);
    mode.objectRows = true;
    const board = await seasonStandings(db, { startsAt: new Date(T0), endsAt: new Date(T0 + 30 * DAY) });
    expect(board.map((m) => [m.handle, m.events])).toEqual([["ana", 1]]);
  });
});
