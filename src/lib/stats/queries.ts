import "server-only";
import { and, count, gte, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Db } from "@/lib/db/client";
import { comments, eventRegistrations, teamMembers, users, writeupHearts, writeups } from "@/lib/db/schema";
import type { MonthKey } from "./growth";

/** "YYYY-MM" in UTC from a timestamp_ms column: the same bucketing as monthKey(). */
const month = (col: SQLiteColumn) => sql<string>`strftime('%Y-%m', ${col} / 1000, 'unixepoch')`;

async function perMonth(db: Db, table: SQLiteTable, col: SQLiteColumn, from: Date, extra?: SQL): Promise<Record<MonthKey, number>> {
  const m = month(col);
  const rows = await db.select({ month: m, n: count() }).from(table).where(and(gte(col, from), extra)).groupBy(m);
  return Object.fromEntries(rows.map((r) => [r.month, Number(r.n)]));
}

/**
 * Monthly counts since `from`. Aggregates only: nothing per member leaves this module except
 * activity()'s ids, which the page only uses to count distinct members and retention.
 */
export async function growthCounts(db: Db, from: Date) {
  const [signups, published, registrations] = await Promise.all([
    perMonth(db, users, users.createdAt, from),
    // Same rule as XP and the library: published and not hidden.
    perMonth(db, writeups, writeups.publishedAt, from, isNull(writeups.hiddenAt)),
    perMonth(db, eventRegistrations, eventRegistrations.createdAt, from),
  ]);
  return { signups, published, registrations };
}

/**
 * Who did something visible, by month: published a writeup, commented, hearted a writeup,
 * registered a team for an event or joined a team. Moderated-away writeups and comments don't
 * count, matching the writeups column. Votes carry no timestamp and bookmarks are private, so
 * neither counts.
 */
export async function activity(db: Db, from: Date): Promise<{ month: MonthKey; uid: string }[]> {
  // `union` (not `union all`) already makes each (month, member) pair distinct.
  return db
    .select({ month: month(writeups.publishedAt), uid: writeups.authorId })
    .from(writeups)
    .where(and(gte(writeups.publishedAt, from), isNull(writeups.hiddenAt)))
    .union(
      db
        .select({ month: month(comments.createdAt), uid: comments.authorId })
        .from(comments)
        .where(and(gte(comments.createdAt, from), isNull(comments.deletedAt), isNull(comments.hiddenAt))),
    )
    .union(db.select({ month: month(writeupHearts.createdAt), uid: writeupHearts.userId }).from(writeupHearts).where(gte(writeupHearts.createdAt, from)))
    .union(
      db
        .select({ month: month(eventRegistrations.createdAt), uid: sql<string>`${eventRegistrations.registeredBy}` })
        .from(eventRegistrations)
        .where(and(gte(eventRegistrations.createdAt, from), isNotNull(eventRegistrations.registeredBy))),
    )
    .union(db.select({ month: month(teamMembers.joinedAt), uid: teamMembers.userId }).from(teamMembers).where(gte(teamMembers.joinedAt, from)));
}
