import type { CHALLENGE_STATUSES } from "@/lib/db/enums";
import { isStaff, type PlatformRole } from "@/lib/auth/platform";
import type { TeamRole } from "@/lib/teams/permissions";
import type { EventPhase } from "./timing";

export type EventAction = "event.create" | "event.edit" | "event.delete" | "event.hide" | "event.register" | "event.roster";

export interface EventActor {
  /** role in the viewer's own team (one team per member) */
  teamRole: TeamRole | null;
  /** the viewer's team is the event's owner_team_id */
  ownsEvent: boolean;
  platformRole: PlatformRole;
}

/** Single source of truth for event permissions; server actions call it, the UI only hides buttons. */
export function canEvent(a: EventActor, action: EventAction): boolean {
  const lead = a.teamRole === "captain" || a.teamRole === "co_captain";
  switch (action) {
    case "event.create":
    case "event.register":
    case "event.roster":
      return lead;
    case "event.edit":
    case "event.delete":
      return lead && a.ownsEvent;
    case "event.hide":
      return isStaff(a.platformRole);
  }
}

/** Deleting would pull the event out from under other teams once anyone else signed up or it started. */
export function deleteAllowed(phase: EventPhase, otherTeamsRegistered: number): boolean {
  return phase === "upcoming" && otherTeamsRegistered === 0;
}

export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];
export type Move = "claim" | "start" | "solve" | "release" | "reopen";
export const MOVES = ["claim", "start", "solve", "release", "reopen"] as const satisfies readonly Move[];

/** War-room state machine. Returns the new status, or null if the move isn't allowed. */
export function nextStatus(from: ChallengeStatus, move: Move, ctx: { isClaimer: boolean; isLead: boolean }): ChallengeStatus | null {
  const owner = ctx.isClaimer || ctx.isLead;
  switch (move) {
    case "claim":
      return from === "open" ? "claimed" : null;
    case "start":
      return from === "claimed" && owner ? "solving" : null;
    case "solve":
      if (from === "open") return "solved";
      return (from === "claimed" || from === "solving") && owner ? "solved" : null;
    case "release":
      return (from === "claimed" || from === "solving") && owner ? "open" : null;
    case "reopen":
      return from === "solved" && owner ? "open" : null;
  }
}
