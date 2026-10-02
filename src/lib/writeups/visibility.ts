import { and, eq, gt, isNotNull, isNull, lte, or, type SQL } from "drizzle-orm";
import { isStaff, type PlatformRole } from "@/lib/auth/platform";
import { writeups } from "@/lib/db/schema";

export interface WriteupVis {
  authorId: string;
  teamId: string | null;
  publishedAt: Date | null;
  hiddenAt: Date | null;
  spoilerUntil: Date | null;
}
export interface Viewer {
  userId: string | null;
  teamId: string | null;
  platformRole: PlatformRole;
}

export function isLocked(w: Pick<WriteupVis, "spoilerUntil">, now: number): boolean {
  return w.spoilerUntil !== null && w.spoilerUntil.getTime() > now;
}

/** The single read rule (spec: Visibility). Lists use listWhere(), which never widens beyond this. */
export function canRead(w: WriteupVis, v: Viewer, now: number): boolean {
  const isAuthor = v.userId !== null && v.userId === w.authorId;
  if (isAuthor) return true;
  if (w.hiddenAt) return isStaff(v.platformRole) && w.publishedAt !== null;
  if (!w.publishedAt) return false;
  if (isLocked(w, now)) return w.teamId !== null && v.teamId === w.teamId;
  return true;
}

/** Spoiler lock follows the linked event's end. */
export function spoilerFor(event: { endsAt: Date } | null): Date | null {
  return event ? event.endsAt : null;
}

/** Rows a viewer may see in lists: public writeups, plus their team's locked ones. Never drafts or hidden. */
export function listWhere(v: Viewer, now: Date): SQL {
  const published = and(isNotNull(writeups.publishedAt), isNull(writeups.hiddenAt));
  const unlocked = or(isNull(writeups.spoilerUntil), lte(writeups.spoilerUntil, now));
  const teamLocked = v.teamId ? and(eq(writeups.teamId, v.teamId), gt(writeups.spoilerUntil, now)) : undefined;
  return and(published, teamLocked ? or(unlocked, teamLocked) : unlocked)!;
}
