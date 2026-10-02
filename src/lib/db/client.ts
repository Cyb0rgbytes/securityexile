import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Cloudflare bindings and secrets (D1, KV, INVITE_PEPPER, …) for this request. */
export function getEnv(): CloudflareEnv {
  return getCloudflareContext().env;
}

/**
 * Drizzle client bound to the D1 `DB` binding for the current request.
 * In `next dev` the binding is a local SQLite file under .wrangler/state
 * (see initOpenNextCloudflareForDev in next.config.ts).
 * Only call from dynamic server code (route handlers, actions, dynamic pages).
 */
export function getDb(): Db {
  return drizzle(getEnv().DB, { schema });
}

/** Required secret, failing loudly instead of hashing with `undefined`. */
export function getSecret(name: "INVITE_PEPPER"): string {
  const v = getEnv()[name];
  if (!v || v.length < 16) throw new Error(`${name} is not configured (see .dev.vars.example).`);
  return v;
}
