#!/usr/bin/env node
// Backup for Build Plan p1-08: a D1 export, the R2 uploads and a manifest the restore drill checks.
//   node scripts/backup.mjs --out <dir>            local D1 (for trying it out)
//   node scripts/backup.mjs --out <dir> --remote   live D1, plus R2 when the R2_* variables are set
// .github/workflows/backup.yml runs it nightly and encrypts <dir> with age; the drill is
// scripts/restore-drill.mjs (docs/STAGE-1-RUNBOOK.md).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { d1Rows, wrangler } from "./lib/wrangler.mjs";

// Must match r2_buckets in wrangler.jsonc.
const BUCKET = "security-exile-uploads";

const flag = (name) => process.argv[process.argv.indexOf(name) + 1];
const remote = process.argv.includes("--remote");
const out = process.argv.includes("--out") ? flag("--out") : null;
if (!out) throw new Error("--out <dir> is required");
mkdirSync(out, { recursive: true });

const where = remote ? "--remote" : "--local";
const d1 = (sql) => d1Rows([where], sql);

/** Row count per table, so a restore can be checked against what was exported. */
function tableCounts() {
  const names = d1("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '\\_cf\\_%' escape '\\' order by name;").map((r) => r.name);
  return d1(countQuery(names))[0];
}

/** One row, one column per table: D1 caps the terms in a compound SELECT, so no UNION ALL. */
function countQuery(names) {
  const ident = (n) => `\`${n.replace(/`/g, "``")}\``;
  return `select ${names.map((n) => `(select count(*) from ${ident(n)}) as ${ident(n)}`).join(", ")};`;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

// Schema and data go in separate files: a single export creates tables alphabetically, so rows
// would reference tables (users) that don't exist yet, and the restore fails. Schema first, then data.
const exportTo = (file, only) => wrangler(["d1", "export", "DB", where, only, "--output", join(out, file), "--skip-confirmation"]);
// The counts must describe the same moment as the export: if a write lands in between, try again.
let tables;
for (let attempt = 1; ; attempt++) {
  const before = tableCounts();
  exportTo("schema.sql", "--no-data");
  exportTo("data.sql", "--no-schema");
  tables = tableCounts();
  if (JSON.stringify(before) === JSON.stringify(tables)) break;
  if (attempt === 3) throw new Error("D1 kept changing during the export; run the backup again");
}
const sqlFile = (file) => {
  const buf = readFileSync(join(out, file));
  return { file, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
};
const schema = sqlFile("schema.sql");
const data = sqlFile("data.sql");

let r2 = null;
const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;
if (remote && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT) {
  const dir = join(out, "r2");
  execFileSync("aws", ["s3", "sync", `s3://${BUCKET}`, dir, "--endpoint-url", R2_ENDPOINT, "--only-show-errors"], {
    env: { ...process.env, AWS_ACCESS_KEY_ID: R2_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION: "auto" },
    stdio: ["ignore", "inherit", "inherit"],
  });
  mkdirSync(dir, { recursive: true });
  const files = walk(dir);
  r2 = { bucket: BUCKET, objects: files.length, bytes: files.reduce((sum, f) => sum + statSync(f).size, 0) };
}

const manifest = {
  createdAt: new Date().toISOString(),
  source: remote ? "remote" : "local",
  commit: process.env.GITHUB_SHA ?? null,
  d1: { schema, data, tables },
  r2,
};
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
const rows = Object.values(tables).reduce((a, b) => a + b, 0);
console.log(`backup: ${Object.keys(tables).length} tables, ${rows} rows, ${schema.bytes + data.bytes} bytes of SQL${r2 ? `, ${r2.objects} R2 objects` : ", no R2"}`);
