import "server-only";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { findMembershipOf } from "@/lib/teams/queries";
import { requestNow } from "./clock";
import { findEventBySlug, findRegistration } from "./queries";
import { warRoomWritable } from "./timing";
import { slugParamSchema } from "./validation";

/**
 * Loads the viewer's war room. Any failure returns the same "not found" error,
 * so outsiders can't learn whether a team is registered.
 */
export async function loadWarRoom(slugRaw: string, opts: { forWrite: boolean }) {
  const member = await requireMember();
  const notFound = { error: "War room not found." } as const;
  const slug = slugParamSchema.safeParse(slugRaw);
  if (!slug.success) return notFound;
  const db = getDb();
  const [event, membership] = await Promise.all([findEventBySlug(db, slug.data), findMembershipOf(db, member.id)]);
  if (!event || event.kind !== "ctf" || !membership) return notFound;
  const registration = await findRegistration(db, event.id, membership.team.id);
  if (!registration) return notFound;
  const writable = warRoomWritable(event, requestNow());
  if (opts.forWrite && !writable) return { error: "This war room is read-only now that the event is over." } as const;
  return { db, member, event, team: membership.team, teamRole: membership.role, registration, writable } as const;
}
