#!/usr/bin/env node
// Orphaned image cleanup (uploads never linked to a writeup, older than 7 days).
//   node scripts/sweep-uploads.mjs                 dry run, local
//   node scripts/sweep-uploads.mjs --delete        delete, local
//   node scripts/sweep-uploads.mjs --remote [...]  live data (owner approval required)
import { execFileSync } from "node:child_process";

const remote = process.argv.includes("--remote");
const del = process.argv.includes("--delete");
const where = remote ? "--remote" : "--local";
const run = (args) => execFileSync("npx", args, { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
const cutoff = Date.now() - 7 * 86_400_000;
// writeup_id only tracks the last writeup saved with an image; an image copied into another
// writeup is still in use, so anything whose key appears in any writeup body is kept.
const query =
  "select u.id, u.r2_key, u.bytes from uploads u" +
  ` where u.writeup_id is null and u.created_at < ${cutoff}` +
  " and not exists (select 1 from writeups w where instr(w.body_md, u.r2_key) > 0)";
const rows = JSON.parse(run(["wrangler", "d1", "execute", "DB", where, "--json", "--command", `"${query}"`])).at(-1).results;
const total = rows.reduce((s, r) => s + r.bytes, 0);
console.log(`${rows.length} orphaned uploads, ${(total / 1048576).toFixed(1)} MB`);
for (const r of rows) {
  console.log(`  ${r.r2_key}`);
  if (!del) continue;
  run(["wrangler", "r2", "object", "delete", `security-exile-uploads/${r.r2_key}`, ...(remote ? ["--remote"] : ["--local"])]);
  run(["wrangler", "d1", "execute", "DB", where, "--command", `"delete from uploads where id = '${r.id}'"`]);
}
if (!del && rows.length) console.log("dry run: add --delete to remove them");
