import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Drizzle client bound to the D1 `DB` binding for the current request.
 * In `next dev` the binding is a local SQLite file under .wrangler/state
 * (see initOpenNextCloudflareForDev in next.config.ts).
 * Only call from dynamic server code (route handlers, actions, dynamic pages).
 */
export function getDb(): Db {
  return drizzle(getCloudflareContext().env.DB, { schema });
}
