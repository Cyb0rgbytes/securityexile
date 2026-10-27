// Shared by backup.mjs and restore-drill.mjs. Runs the project's wrangler through node itself,
// with no shell, so nothing (SQL, Windows paths) needs quoting on any platform.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url));

export function wrangler(args, env) {
  return execFileSync(process.execPath, [bin, ...args], { encoding: "utf8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "inherit"] });
}

/**
 * Rows from one `d1 execute --command` (target is ["--remote"] or ["--local", …]). --command uses
 * D1's query endpoint, unlike --file, which goes through import. Remote runs can print progress
 * lines before the JSON, so parsing starts at the first line that opens it.
 */
export function d1Rows(target, sql) {
  const out = wrangler(["d1", "execute", "DB", ...target, "--json", "--command", sql]);
  return JSON.parse(out.slice(out.search(/^[[{]/m))).at(-1)?.results ?? [];
}
