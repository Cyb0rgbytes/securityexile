import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import { requestNow } from "@/lib/events/clock";
import { findMembershipOf } from "@/lib/teams/queries";
import { listSeriesOf } from "./queries";

/** Options for the editor's event / series / team pickers. */
export async function editorChoices(memberId: string) {
  const db = getDb();
  const since = new Date(requestNow() - 90 * 86_400_000);
  const membership = await findMembershipOf(db, memberId);
  // Hidden events are only offered to the team that added them (same rule as the event pages).
  const visible = membership ? or(isNull(events.hiddenAt), eq(events.ownerTeamId, membership.team.id)) : isNull(events.hiddenAt);
  const [evs, series] = await Promise.all([
    db.select({ id: events.id, title: events.title }).from(events).where(and(gt(events.endsAt, since), visible)).limit(200),
    listSeriesOf(db, memberId),
  ]);
  return { events: evs, series, hasTeam: !!membership };
}
