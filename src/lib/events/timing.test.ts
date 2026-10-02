import { describe, expect, it } from "vitest";
import { eventPhase, formatCountdown, registrationOpen, warRoomWritable, WAR_ROOM_GRACE_MS } from "./timing";

const H = 3_600_000;
const ev = { startsAt: new Date(10 * H), endsAt: new Date(20 * H) };

describe("eventPhase", () => {
  it("is upcoming before start", () => expect(eventPhase(ev, 10 * H - 1)).toBe("upcoming"));
  it("is live from start (inclusive)", () => expect(eventPhase(ev, 10 * H)).toBe("live"));
  it("is live just before end", () => expect(eventPhase(ev, 20 * H - 1)).toBe("live"));
  it("is past at end (exclusive)", () => expect(eventPhase(ev, 20 * H)).toBe("past"));
});

describe("warRoomWritable", () => {
  it("is writable during the event", () => expect(warRoomWritable(ev, 15 * H)).toBe(true));
  it("stays writable inside the 24 h grace", () => expect(warRoomWritable(ev, 20 * H + WAR_ROOM_GRACE_MS - 1)).toBe(true));
  it("locks at end + 24 h", () => expect(warRoomWritable(ev, 20 * H + WAR_ROOM_GRACE_MS)).toBe(false));
});

describe("registrationOpen", () => {
  it("is open for a CTF before it ends", () => expect(registrationOpen({ kind: "ctf", endsAt: ev.endsAt }, 15 * H)).toBe(true));
  it("closes when the CTF ends", () => expect(registrationOpen({ kind: "ctf", endsAt: ev.endsAt }, 20 * H)).toBe(false));
  it("never opens for community events", () => expect(registrationOpen({ kind: "community", endsAt: ev.endsAt }, 0)).toBe(false));
});

describe("formatCountdown", () => {
  it("formats hours:minutes:seconds", () => expect(formatCountdown(2 * H + 14 * 60_000 + 9_000)).toBe("02:14:09"));
  it("adds days when over 24 h", () => expect(formatCountdown(26 * H)).toBe("1d 02:00:00"));
  it("clamps negatives to zero", () => expect(formatCountdown(-5)).toBe("00:00:00"));
});
