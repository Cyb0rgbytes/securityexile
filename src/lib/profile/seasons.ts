/**
 * Seasons are windows over the same contributions the all-time XP counts (docs/XP.md): a writeup
 * belongs to the season it was published in, an event to the season it starts in. Season XP is
 * recounted from those rows on every read, never stored, so it can't drift either.
 *
 * Rows in `seasons` are created by a reviewed DB command, like roles (docs/SEASONS.md).
 */
export type Season = { id: string; name: string; startsAt: Date; endsAt: Date };
export type SeasonStatus = "upcoming" | "live" | "ended";

/** Windows are half-open, [startsAt, endsAt): back-to-back seasons never both claim an instant. */
export function seasonStatus(s: Pick<Season, "startsAt" | "endsAt">, now: number): SeasonStatus {
  if (now < s.startsAt.getTime()) return "upcoming";
  return now < s.endsAt.getTime() ? "live" : "ended";
}

/** The live season; if windows overlap by mistake, the one that started last wins. */
export function currentSeason<S extends Season>(seasons: readonly S[], now: number): S | null {
  return seasons.filter((s) => seasonStatus(s, now) === "live").sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0] ?? null;
}

/** Seasons for the archive list, newest first, leaving out ones that haven't started. */
export function pastAndLive<S extends Season>(seasons: readonly S[], now: number): S[] {
  return seasons.filter((s) => seasonStatus(s, now) !== "upcoming").sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
}
