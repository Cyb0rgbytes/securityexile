#!/usr/bin/env node
// Restore drill for Build Plan p1-08: proves a backup restores, without touching any real database.
//   node scripts/restore-drill.mjs <securityexile-YYYY-MM-DD.tar.gz.age> --key <age identity file>
//   node scripts/restore-drill.mjs <backup .tar.gz or directory>          (unencrypted, for testing)
// Decrypts into a temp directory, checks the SQL against the manifest's hash, loads it into a
// throwaway local D1 (--persist-to the temp dir), and compares every table's row count and the
// R2 object count with the manifest. The temp directory, plaintext included, is deleted on exit.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const input = process.argv[2];
const key = process.argv.includes("--key") ? process.argv[process.argv.indexOf("--key") + 1] : null;
if (!input || !existsSync(input)) throw new Error("usage: restore-drill.mjs <backup> [--key <identity file>]");

const win = process.platform === "win32";
const path = (p) => (win ? `"${p}"` : p);
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", shell: win, stdio: ["ignore", "pipe", "inherit"] });

const tmp = mkdtempSync(join(tmpdir(), "se-restore-"));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));

let dir = input;
if (!statSync(input).isDirectory()) {
  let archive = input;
  if (input.endsWith(".age")) {
    if (!key) throw new Error("an .age backup needs --key <identity file>");
    archive = join(tmp, "backup.tar.gz");
    run("age", ["--decrypt", "--identity", path(key), "--output", path(archive), path(input)]);
  }
  dir = join(tmp, "backup");
  mkdirSync(dir);
  run("tar", ["-xzf", path(archive), "-C", path(dir)]);
}

const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const problems = [];
const parts = [manifest.d1.schema, manifest.d1.data];
for (const p of parts) {
  if (createHash("sha256").update(readFileSync(join(dir, p.file))).digest("hex") !== p.sha256) problems.push(`${p.file} doesn't match the manifest's sha256`);
}

const state = join(tmp, "state");
const local = ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", path(state)];
// Schema first, then data: the same order a real restore into D1 needs.
for (const p of parts) run("npx", [...local, "--yes", "--file", path(join(dir, p.file))]);
function d1(query) {
  const file = join(tmp, "q.sql");
  writeFileSync(file, query);
  return JSON.parse(run("npx", [...local, "--json", "--file", path(file)])).at(-1)?.results ?? [];
}

const expected = manifest.d1.tables;
// One row, one column per table, as in backup.mjs (D1 caps the terms in a compound SELECT).
const ident = (n) => `"${n.replace(/"/g, '""')}"`;
const present = new Set(d1("select name from sqlite_master where type = 'table';").map((r) => r.name));
const tables = Object.keys(expected).filter((n) => present.has(n));
const restored = tables.length ? d1(`select ${tables.map((n) => `(select count(*) from ${ident(n)}) as ${ident(n)}`).join(", ")};`)[0] : {};
for (const [table, n] of Object.entries(expected)) {
  if (restored[table] !== n) problems.push(`${table}: ${restored[table] ?? "missing"} rows restored, ${n} expected`);
}

if (manifest.r2) {
  const r2 = join(dir, "r2");
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const objects = existsSync(r2) ? walk(r2).length : 0;
  if (objects !== manifest.r2.objects) problems.push(`R2: ${objects} objects in the backup, ${manifest.r2.objects} expected`);
}

const rows = Object.values(expected).reduce((a, b) => a + b, 0);
console.log(`backup from ${manifest.createdAt} (${manifest.source}): ${Object.keys(expected).length} tables, ${rows} rows${manifest.r2 ? `, ${manifest.r2.objects} R2 objects` : ""}`);
if (problems.length) {
  console.error(`RESTORE DRILL FAILED\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("RESTORE DRILL PASSED: note today's date on p1-08 in the Build Plan");
