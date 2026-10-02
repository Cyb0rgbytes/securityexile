/** Pure time rules for events. `now` is always passed in so callers and tests control the clock. */

export type EventPhase = "upcoming" | "live" | "past";

export const WAR_ROOM_GRACE_MS = 24 * 3_600_000;
export const MAX_EVENT_MS = 14 * 86_400_000;

export function eventPhase(e: { startsAt: Date; endsAt: Date }, now: number): EventPhase {
  if (now < e.startsAt.getTime()) return "upcoming";
  if (now < e.endsAt.getTime()) return "live";
  return "past";
}

/** Teams keep editing for a day after the end to tidy notes before writeups. */
export function warRoomWritable(e: { endsAt: Date }, now: number): boolean {
  return now < e.endsAt.getTime() + WAR_ROOM_GRACE_MS;
}

export function registrationOpen(e: { kind: "ctf" | "community"; endsAt: Date }, now: number): boolean {
  return e.kind === "ctf" && now < e.endsAt.getTime();
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}
