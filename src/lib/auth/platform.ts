import type { PLATFORM_ROLES } from "@/lib/db/enums";

/**
 * Site-wide role, separate from team roles. Assigned only by a reviewed
 * database command; nothing in the web app can change it.
 */
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Moderation powers (currently: hide / unhide events). */
export function isStaff(r: PlatformRole | null | undefined): boolean {
  return r === "moderator" || r === "admin";
}
