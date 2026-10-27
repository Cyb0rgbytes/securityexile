#!/usr/bin/env node
// Re-renders body_html for all writeups and comments after a change to src/lib/writeups/render.ts.
//   npx tsx scripts/rerender-writeups.mjs            local D1
//   npx tsx scripts/rerender-writeups.mjs --remote   live D1 (owner approval required)
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderComment, renderWriteup } from "../src/lib/writeups/render.ts";

const remote = process.argv.includes("--remote");
const FILES = remote ? "https://files.securityexile.com" : "/dev-files";
const tmp = mkdtempSync(join(tmpdir(), "se-rerender-"));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
function d1(sql) {
  const file = join(tmp, `q${n++}.sql`);
  writeFileSync(file, sql);
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "DB", remote ? "--remote" : "--local", "--json", "--file", `"${file}"`], { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out).at(-1)?.results ?? [];
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
// D1 caps one statement at 100 KB, and a long writeup renders to more than that. So the value
// goes in as an empty set plus appends of at most 12 000 code points each: a code point is at
// most 4 bytes in UTF-8 (a quote doubled by escaping is 2), so a statement stays under 50 KB.
// Split by code point so a chunk never ends halfway through a surrogate pair.
const CHUNK = 12_000;
const MAX_BODY_HTML_BYTES = 1_000_000; // mirrors src/lib/writeups/validation.ts
function setHtml(table, id, html) {
  if (Buffer.byteLength(html) > MAX_BODY_HTML_BYTES) console.warn(`${table} ${id} now renders past the save limit; it will refuse its next edit`);
  const chars = Array.from(html);
  const parts = [`update ${table} set body_html = '' where id = ${q(id)};`];
  for (let i = 0; i < chars.length; i += CHUNK) parts.push(`update ${table} set body_html = body_html || ${q(chars.slice(i, i + CHUNK).join(""))} where id = ${q(id)};`);
  // One file per row: if it fails partway, rerunning the script rewrites the row from scratch.
  d1(parts.join("\n"));
}
for (const w of d1("select id, body_md from writeups")) setHtml("writeups", w.id, renderWriteup(w.body_md, { filesOrigin: FILES }));
for (const c of d1("select id, body_md from comments where deleted_at is null")) setHtml("comments", c.id, renderComment(c.body_md));
console.log(`re-rendered (${remote ? "remote" : "local"})`);
