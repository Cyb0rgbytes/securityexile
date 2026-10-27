#!/usr/bin/env node
// One-off: moves members from the Clerk development instance to production (docs/CLERK-MIGRATION.md).
// For every D1 user whose clerk_id is a dev-instance user, finds or creates the production Clerk
// user with the same primary email, then writes SQL that repoints users.clerk_id. Everything else
// (writeups, teams, XP) hangs off users.id, so it follows. The SQL is written, never run.
//
//   CLERK_DEV_SECRET_KEY=sk_test_… npx tsx scripts/migrate-clerk-users.mjs [--remote]
//       dry run: shows which members would move; touches nothing
//   … CLERK_PROD_SECRET_KEY=sk_live_… npx tsx scripts/migrate-clerk-users.mjs --remote [--create]
//       also matches production users by email; --create makes the missing ones
import { createClerkClient } from "@clerk/backend";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const remote = process.argv.includes("--remote");
const create = process.argv.includes("--create");
const devKey = process.env.CLERK_DEV_SECRET_KEY;
const prodKey = process.env.CLERK_PROD_SECRET_KEY;
if (!devKey?.startsWith("sk_test_")) throw new Error("CLERK_DEV_SECRET_KEY must be the development instance's sk_test_ key");
if (prodKey && !prodKey.startsWith("sk_live_")) throw new Error("CLERK_PROD_SECRET_KEY must be the production instance's sk_live_ key");
if (create && !prodKey) throw new Error("--create needs CLERK_PROD_SECRET_KEY");

const dev = createClerkClient({ secretKey: devKey });
const prod = prodKey ? createClerkClient({ secretKey: prodKey }) : null;
const tmp = mkdtempSync(join(tmpdir(), "se-clerk-migration-"));

function d1(sql) {
  const file = join(tmp, "q.sql");
  writeFileSync(file, sql);
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "DB", remote ? "--remote" : "--local", "--json", "--file", `"${file}"`], { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out).at(-1)?.results ?? [];
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
// Emails go to the terminal masked; the SQL file holds only ids.
const mask = (e) => e.replace(/^(.).*?(@.*)$/, "$1***$2");
const notFound = (e) => e?.status === 404;

const rows = d1("select id, clerk_id, handle from users order by created_at");
const byClerkId = new Map(rows.map((r) => [r.clerk_id, r]));
const updates = [];
const report = [];

for (const row of rows) {
  const who = row.handle ?? `(no handle) ${row.id}`;
  const devUser = await dev.users.getUser(row.clerk_id).catch((e) => (notFound(e) ? null : Promise.reject(e)));
  if (!devUser) { report.push(`skip     ${who}: not a dev-instance user (already production?)`); continue; }

  const email = devUser.emailAddresses.find((a) => a.id === devUser.primaryEmailAddressId)?.emailAddress;
  if (!email) { report.push(`MANUAL   ${who}: dev user has no primary email`); continue; }
  if (!prod) { report.push(`would    ${who} <${mask(email)}>`); continue; }

  let prodUser = (await prod.users.getUserList({ emailAddress: [email] })).data[0];
  if (!prodUser && !create) { report.push(`create   ${who} <${mask(email)}>: no production user yet (run with --create)`); continue; }
  if (!prodUser) {
    prodUser = await prod.users.createUser({
      externalId: row.id,
      emailAddress: [email],
      firstName: devUser.firstName ?? undefined,
      lastName: devUser.lastName ?? undefined,
      skipPasswordRequirement: true,
      skipLegalChecks: true,
      createdAt: new Date(devUser.createdAt),
    });
  }

  // The member already signed up on production, so D1 has a second, newer row for them.
  const clash = byClerkId.get(prodUser.id);
  if (clash && clash.id !== row.id) {
    report.push(`MANUAL   ${who} <${mask(email)}>: production account already has D1 row ${clash.id} (${clash.handle ?? "no handle"})`);
    continue;
  }
  updates.push(`update users set clerk_id = ${q(prodUser.id)}, updated_at = ${Date.now()} where id = ${q(row.id)} and clerk_id = ${q(row.clerk_id)};`);
  report.push(`move     ${who} <${mask(email)}> -> ${prodUser.id}`);
}

console.log(report.join("\n"));
if (updates.length) {
  const out = join(tmp, "clerk-migration.sql");
  writeFileSync(out, updates.join("\n") + "\n");
  console.log(`\n${updates.length} update(s) written to ${out}\nReview it, then: npx wrangler d1 execute DB ${remote ? "--remote" : "--local"} --file "${out}"`);
}
