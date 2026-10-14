import "server-only";
import { getMember, type OnboardedMember } from "@/lib/auth/member";
import { isStaff } from "@/lib/auth/platform";
import type { Db } from "@/lib/db/client";
import type { TeamRole } from "@/lib/teams/permissions";
import { findMembershipOf, type Team } from "@/lib/teams/queries";
import type { EventActor } from "./permissions";
import type { EventRow } from "./queries";

export interface EventViewer {
  member: OnboardedMember | null;
  team: Team | null;
  teamRole: TeamRole | null;
  staff: boolean;
}

/** Who is looking: optional sign-in for public pages. */
export async function loadViewer(db: Db): Promise<EventViewer> {
  const m = await getMember();
  if (!m || !m.handle) return { member: null, team: null, teamRole: null, staff: false };
  const membership = await findMembershipOf(db, m.id);
  return {
    member: m as OnboardedMember,
    team: membership?.team ?? null,
    teamRole: membership?.role ?? null,
    staff: isStaff(m.platformRole),
  };
}

export function actorFor(v: EventViewer, e: EventRow | null): EventActor {
  return {
    teamRole: v.teamRole,
    ownsEvent: !!e && !!v.team && e.ownerTeamId === v.team.id,
    platformRole: v.member?.platformRole ?? "member",
    ownsPersonal: !!e && !e.ownerTeamId && !!v.member && e.createdBy === v.member.id,
    isOrganizer: !!v.member?.isOrganizer,
  };
}

/** Hidden events stay visible to moderators and to whoever added them (team, or the member for a personal event). */
export function canSeeEvent(e: EventRow, v: EventViewer): boolean {
  if (!e.hiddenAt) return true;
  if (v.staff) return true;
  if (e.ownerTeamId) return !!v.team && e.ownerTeamId === v.team.id;
  return !!v.member && e.createdBy === v.member.id;
}
