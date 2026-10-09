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
for (const w of d1("select id, body_md from writeups")) d1(`update writeups set body_html = ${q(renderWriteup(w.body_md, { filesOrigin: FILES }))} where id = ${q(w.id)};`);
for (const c of d1("select id, body_md from comments where deleted_at is null")) d1(`update comments set body_html = ${q(renderComment(c.body_md))} where id = ${q(c.id)};`);
console.log(`re-rendered (${remote ? "remote" : "local"})`);
