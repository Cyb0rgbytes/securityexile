/**
 * True if `e` (or anything in its `cause` chain) is a SQLite UNIQUE violation,
 * optionally on a specific index or column (e.g. "teams.tag", "challenges_name_uq").
 * Drizzle wraps driver errors as "Failed query: …" with the D1 error as `cause`,
 * so checking only the top-level message misses it.
 */
export function isUniqueViolation(e: unknown, target?: string): boolean {
  for (let cur: unknown = e, depth = 0; cur && depth < 5; depth++) {
    const msg = cur instanceof Error ? cur.message : typeof cur === "string" ? cur : "";
    if (msg.includes("UNIQUE constraint failed") && (!target || msg.includes(target))) return true;
    cur = cur instanceof Error ? cur.cause : undefined;
  }
  return false;
}
