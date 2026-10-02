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
const rows = JSON.parse(run(["wrangler", "d1", "execute", "DB", where, "--json", "--command", `"select id, r2_key, bytes from uploads where writeup_id is null and created_at < ${cutoff}"`])).at(-1).results;
const total = rows.reduce((s, r) => s + r.bytes, 0);
console.log(`${rows.length} orphaned uploads, ${(total / 1048576).toFixed(1)} MB`);
for (const r of rows) {
  console.log(`  ${r.r2_key}`);
  if (!del) continue;
  run(["wrangler", "r2", "object", "delete", `security-exile-uploads/${r.r2_key}`, ...(remote ? ["--remote"] : ["--local"])]);
  run(["wrangler", "d1", "execute", "DB", where, "--command", `"delete from uploads where id = '${r.id}'"`]);
}
if (!del && rows.length) console.log("dry run: add --delete to remove them");
