import { describe, expect, it } from "vitest";
import { canEvent, canHostAsTeam, deleteAllowed, MOVES, nextStatus, type ChallengeStatus } from "./permissions";

const base = { teamRole: null, ownsEvent: false, platformRole: "member", ownsPersonal: false, isOrganizer: false } as const;

describe("canEvent", () => {
  it("every member can create events, with or without a team", () => {
    expect(canEvent({ ...base, teamRole: "captain" }, "event.create")).toBe(true);
    expect(canEvent({ ...base, teamRole: "member" }, "event.create")).toBe(true);
    expect(canEvent(base, "event.create")).toBe(true);
  });
  it("only leads host as their team", () => {
    expect(canHostAsTeam("captain")).toBe(true);
    expect(canHostAsTeam("co_captain")).toBe(true);
    expect(canHostAsTeam("member")).toBe(false);
    expect(canHostAsTeam(null)).toBe(false);
  });
  it("only the owner team's leads edit or delete a team event", () => {
    expect(canEvent({ ...base, teamRole: "captain", ownsEvent: true }, "event.edit")).toBe(true);
    expect(canEvent({ ...base, teamRole: "captain", ownsEvent: false }, "event.edit")).toBe(false);
    expect(canEvent({ ...base, teamRole: "member", ownsEvent: true }, "event.delete")).toBe(false);
  });
  it("the creator of a personal event edits and deletes it", () => {
    expect(canEvent({ ...base, ownsPersonal: true }, "event.edit")).toBe(true);
    expect(canEvent({ ...base, ownsPersonal: true }, "event.delete")).toBe(true);
    expect(canEvent({ ...base, ownsPersonal: true }, "event.register")).toBe(false);
  });
  it("organizers edit any event but get no team or moderation powers", () => {
    expect(canEvent({ ...base, isOrganizer: true }, "event.edit")).toBe(true);
    expect(canEvent({ ...base, isOrganizer: true }, "event.hide")).toBe(false);
    expect(canEvent({ ...base, isOrganizer: true }, "event.roster")).toBe(false);
  });
  it("staff hide events, without team roles", () => {
    expect(canEvent({ ...base, platformRole: "moderator" }, "event.hide")).toBe(true);
    expect(canEvent({ ...base, teamRole: "captain", ownsEvent: true }, "event.hide")).toBe(false);
  });
  it("staff role doesn't grant team actions", () => expect(canEvent({ ...base, platformRole: "admin" }, "event.register")).toBe(false));
  it("leads register and set rosters", () => {
    expect(canEvent({ ...base, teamRole: "co_captain" }, "event.register")).toBe(true);
    expect(canEvent({ ...base, teamRole: "reserve" }, "event.roster")).toBe(false);
  });
});

describe("deleteAllowed", () => {
  it("only before start with no other teams", () => {
    expect(deleteAllowed("upcoming", 0)).toBe(true);
    expect(deleteAllowed("upcoming", 1)).toBe(false);
    expect(deleteAllowed("live", 0)).toBe(false);
  });
});

describe("nextStatus", () => {
  const anyone = { isClaimer: false, isLead: false };
  const claimer = { isClaimer: true, isLead: false };
  const lead = { isClaimer: false, isLead: true };
  it("anyone claims an open challenge", () => expect(nextStatus("open", "claim", anyone)).toBe("claimed"));
  it("can't claim a claimed challenge", () => expect(nextStatus("claimed", "claim", anyone)).toBeNull());
  it("claimer starts solving", () => expect(nextStatus("claimed", "start", claimer)).toBe("solving"));
  it("others can't start someone else's claim", () => expect(nextStatus("claimed", "start", anyone)).toBeNull());
  it("anyone may mark an open challenge solved", () => expect(nextStatus("open", "solve", anyone)).toBe("solved"));
  it("only claimer/lead solve a claimed one", () => {
    expect(nextStatus("solving", "solve", anyone)).toBeNull();
    expect(nextStatus("solving", "solve", lead)).toBe("solved");
  });
  it("release returns to open for claimer or lead", () => {
    expect(nextStatus("solving", "release", claimer)).toBe("open");
    expect(nextStatus("claimed", "release", lead)).toBe("open");
    expect(nextStatus("claimed", "release", anyone)).toBeNull();
  });
  it("reopen only from solved", () => {
    expect(nextStatus("solved", "reopen", claimer)).toBe("open");
    expect(nextStatus("open", "reopen", lead)).toBeNull();
  });
  it("every (status, move) pair is defined", () => {
    for (const s of ["open", "claimed", "solving", "solved"] as ChallengeStatus[])
      for (const m of MOVES) expect(() => nextStatus(s, m, lead)).not.toThrow();
  });
});
