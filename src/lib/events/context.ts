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
  };
}

/** Hidden events stay visible to moderators and to the team that added them. */
export function canSeeEvent(e: EventRow, v: EventViewer): boolean {
  if (!e.hiddenAt) return true;
  return v.staff || (!!v.team && e.ownerTeamId === v.team.id);
}
