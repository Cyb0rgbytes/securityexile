import "server-only";
import { auditLog } from "@/lib/db/schema";
import { newId } from "@/lib/db/ids";

export type AuditAction =
  | "team.create"
  | "team.update_identity"
  | "team.update_profile"
  | "team.disband"
  | "invite.create"
  | "invite.revoke"
  | "invite.redeem"
  | "request.create"
  | "request.approve"
  | "request.reject"
  | "member.set_role"
  | "member.kick"
  | "member.leave"
  | "captain.transfer"
  | "event.create"
  | "event.update"
  | "event.delete"
  | "event.hide"
  | "event.unhide"
  | "event.register"
  | "event.unregister"
  | "event.roster"
  | "writeup.publish"
  | "writeup.unpublish"
  | "writeup.delete"
  | "writeup.hide"
  | "writeup.unhide"
  | "comment.hide"
  | "comment.unhide";

/**
 * Builds an audit_log row. Returned (not inserted) so callers can put the
 * insert in the same db.batch() as the change it records: both land or neither.
 * `meta` holds handles/labels for display, never secrets (no invite codes).
 */
export function auditEntry(input: {
  teamId: string | null;
  actorId: string;
  action: AuditAction;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): typeof auditLog.$inferInsert {
  return {
    id: newId(),
    teamId: input.teamId,
    actorId: input.actorId,
    action: input.action,
    targetId: input.targetId ?? null,
    meta: input.meta ?? null,
  };
}

/** Human-readable line for the manage screen. */
export function describeAudit(action: string, actor: string | null, meta: Record<string, unknown> | null): string {
  const who = actor ? `@${actor}` : "someone";
  const m = meta ?? {};
  const target = typeof m.target === "string" ? `@${m.target}` : "a member";
  switch (action) {
    case "team.create": return `${who} created the team`;
    case "team.update_identity": return `${who} changed the team's name, tag, join mode or emblem`;
    case "team.update_profile": return `${who} edited the bio or focus areas`;
    case "invite.create": return `${who} created a ${m.public ? "public" : "private"} invite code ${m.hint ?? ""}`.trim();
    case "invite.revoke": return `${who} revoked invite code ${m.hint ?? ""}`.trim();
    case "invite.redeem": return `${who} joined with invite code ${m.hint ?? ""}`.trim();
    case "request.create": return `${who} asked to join`;
    case "request.approve": return `${who} approved ${target}'s request`;
    case "request.reject": return `${who} rejected ${target}'s request`;
    case "member.set_role": return `${who} made ${target} ${String(m.role ?? "").replace("_", "-")}`;
    case "member.kick": return `${who} removed ${target}`;
    case "member.leave": return `${who} left the team`;
    case "captain.transfer": return `${who} handed captaincy to ${target}`;
    case "event.create": return `${who} added the event ${m.title ?? ""}`.trim();
    case "event.update": return `${who} edited the event ${m.title ?? ""}`.trim();
    case "event.delete": return `${who} deleted the event ${m.title ?? ""}`.trim();
    case "event.hide": return `${who} hid the event ${m.title ?? ""}`.trim();
    case "event.unhide": return `${who} restored the event ${m.title ?? ""}`.trim();
    case "event.register": return `${who} registered the team for ${m.title ?? "an event"}`;
    case "event.unregister": return `${who} withdrew the team from ${m.title ?? "an event"}`;
    case "event.roster": return `${who} updated the roster for ${m.title ?? "an event"}`;
    case "writeup.publish": return `${who} published ${m.title ?? "a writeup"}`;
    case "writeup.unpublish": return `${who} unpublished ${m.title ?? "a writeup"}`;
    case "writeup.delete": return `${who} deleted ${m.title ?? "a writeup"}`;
    case "writeup.hide": return `${who} hid ${m.title ?? "a writeup"}`;
    case "writeup.unhide": return `${who} restored ${m.title ?? "a writeup"}`;
    case "comment.hide": return `${who} hid a comment`;
    case "comment.unhide": return `${who} restored a comment`;
    default: return `${who}: ${action}`;
  }
}
