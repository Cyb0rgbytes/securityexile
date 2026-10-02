#!/usr/bin/env node
// Seeds fake members into the LOCAL D1 database so captain screens (requests,
// roles, kick, transfer) can be tested with a single real account.
//
//   node scripts/seed-dev.mjs <TEAM_TAG>          add 3 members + 2 pending requests to that team
//   node scripts/seed-dev.mjs <TEAM_TAG> --event  also add a live CTF the team is registered for, with 4 challenges
//   node scripts/seed-dev.mjs --clean        remove everything this script created
//
// Never touches the remote database: every command runs with --local.
// Seeded rows use ids/handles starting with "seed-" so cleanup is exact.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/seed-dev.mjs <TEAM_TAG> | --clean");
  process.exit(1);
}

// SQL goes through a temp file: on Windows `npx` needs a shell, and a shell
// would split a --command argument on spaces.
const tmp = mkdtempSync(join(tmpdir(), "se-seed-"));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));
let n = 0;

function d1(sql) {
  const file = join(tmp, `q${n++}.sql`);
  writeFileSync(file, sql);
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--json", "--file", `"${file}"`], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = JSON.parse(out);
  return parsed[parsed.length - 1]?.results ?? [];
}

const now = Date.now();

if (arg === "--clean") {
  d1(`delete from challenges where id like 'seed-%' or event_id like 'seed-%';
      delete from event_registrations where event_id like 'seed-%';
      delete from events where id like 'seed-%';
      delete from join_requests where id like 'seed-%' or user_id like 'seed-%';
      delete from team_members where user_id like 'seed-%';
      delete from users where id like 'seed-%';`);
  console.log("removed seeded members and requests");
  process.exit(0);
}

if (!/^[A-Za-z0-9]{2,5}$/.test(arg)) {
  console.error("team tag must be 2–5 letters/numbers");
  process.exit(1);
}
const tag = arg.toUpperCase();
const [team] = d1(`select id, join_mode from teams where tag = '${tag}'`);
if (!team) {
  console.error(`no team with tag ${tag} in the local database`);
  process.exit(1);
}

const people = [
  { id: "seed-acid", handle: "seed-acid-burn", role: "co_captain" },
  { id: "seed-cereal", handle: "seed-cereal", role: "member" },
  { id: "seed-phreak", handle: "seed-phreak", role: "reserve" },
  { id: "seed-lord", handle: "seed-lord-nikon", request: "Big fan of the war room idea, happy to do web." },
  { id: "seed-joey", handle: "seed-joey", request: null },
];

const values = people
  .map((p) => `('${p.id}','clerk_${p.id}','${p.handle}','${p.handle.replace("seed-", "")} (seed)',${now},${now})`)
  .join(",");
d1(`insert or ignore into users(id, clerk_id, handle, display_name, created_at, updated_at) values ${values};`);

for (const p of people.filter((p) => p.role)) {
  d1(`insert or ignore into team_members(team_id, user_id, role, joined_at) values ('${team.id}','${p.id}','${p.role}',${now});`);
}
for (const p of people.filter((p) => p.request !== undefined)) {
  const msg = p.request ? `'${p.request.replace(/'/g, "''")}'` : "null";
  d1(`insert or ignore into join_requests(id, team_id, user_id, message, status, created_at)
      values ('seed-req-${p.id}','${team.id}','${p.id}',${msg},'pending',${now});`);
}

if (process.argv.includes("--event")) {
  const start = now - 3_600_000;
  const end = now + 47 * 3_600_000;
  d1(`insert or ignore into events(id, slug, title, kind, format, starts_at, ends_at, owner_team_id, created_at)
      values ('seed-ev', 'seed-live-ctf', 'Seed Live CTF', 'ctf', 'jeopardy', ${start}, ${end}, '${team.id}', ${now});
      insert or ignore into event_registrations(event_id, team_id, roster_json, created_at)
      values ('seed-ev', '${team.id}', '["seed-acid","seed-cereal"]', ${now});`);
  const chals = [
    ["seed-ch-1", "baby-sqli", "web", 100, "open", "null"],
    ["seed-ch-2", "ret2win", "pwn", 250, "claimed", "'seed-acid'"],
    ["seed-ch-3", "xor-me", "crypto", 150, "solving", "'seed-cereal'"],
    ["seed-ch-4", "strings", "rev", 50, "solved", "'seed-cereal'"],
  ];
  for (const [id, name, cat, pts, status, by] of chals) {
    d1(`insert or ignore into challenges(id, event_id, team_id, name, category, points, status, claimed_by, links_json, updated_at)
        values ('${id}', 'seed-ev', '${team.id}', '${name}', '${cat}', ${pts}, '${status}', ${by}, '[]', ${now});`);
  }
  console.log(`seeded a live CTF 'seed-live-ctf' with 4 challenges for ${tag}`);
}

console.log(`seeded ${tag}: 3 members (co-captain, member, reserve) + 2 pending join requests`);
if (team.join_mode !== "open") console.log(`note: ${tag} is "${team.join_mode}", requests only show while the team is "open".`);
console.log("undo with: node scripts/seed-dev.mjs --clean");
