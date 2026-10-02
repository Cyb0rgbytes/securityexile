import type { TEAM_ROLES } from "@/lib/db/enums";

export type TeamRole = (typeof TEAM_ROLES)[number];

export type TeamAction =
  | "team.edit_identity" // name, tag, join mode, emblem
  | "team.edit_profile" // bio, focus categories
  | "invite.manage" // create / revoke codes
  | "request.decide" // approve / reject join requests
  | "member.set_role"
  | "member.kick"
  | "captain.transfer";

/**
 * The single source of truth for who may do what inside a team.
 * Server actions call this after loading the actor's membership from the
 * database; the UI only uses it to hide buttons.
 *
 * `target` is the role of the member being acted on (kick / set_role / transfer).
 */
export function can(actor: TeamRole | null | undefined, action: TeamAction, target?: TeamRole): boolean {
  if (!actor) return false;
  const lead = actor === "captain" || actor === "co_captain";

  switch (action) {
    case "team.edit_identity":
    case "member.set_role":
      // Nobody can change the captain's role directly; use captain.transfer.
      if (action === "member.set_role" && target === "captain") return false;
      return actor === "captain";
    case "captain.transfer":
      return actor === "captain" && target !== undefined && target !== "captain";
    case "team.edit_profile":
    case "invite.manage":
    case "request.decide":
      return lead;
    case "member.kick":
      if (!target || target === "captain") return false;
      if (actor === "captain") return true;
      return actor === "co_captain" && (target === "member" || target === "reserve");
  }
}

/** Roles a captain may assign with member.set_role. */
export const ASSIGNABLE_ROLES = ["co_captain", "member", "reserve"] as const satisfies readonly TeamRole[];
