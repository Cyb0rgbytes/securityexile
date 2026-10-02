import "server-only";
import { gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import { requestNow } from "@/lib/events/clock";
import { findMembershipOf } from "@/lib/teams/queries";
import { listSeriesOf } from "./queries";

/** Options for the editor's event / series / team pickers. */
export async function editorChoices(memberId: string) {
  const db = getDb();
  const since = new Date(requestNow() - 90 * 86_400_000);
  const [evs, series, membership] = await Promise.all([
    db.select({ id: events.id, title: events.title }).from(events).where(gt(events.endsAt, since)).limit(200),
    listSeriesOf(db, memberId),
    findMembershipOf(db, memberId),
  ]);
  return { events: evs, series, hasTeam: !!membership };
}
