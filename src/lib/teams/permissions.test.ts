import { describe, expect, it } from "vitest";
import { can, type TeamAction, type TeamRole } from "./permissions";

const ROLES: TeamRole[] = ["captain", "co_captain", "member", "reserve"];

describe("can() — actor-only actions", () => {
  const table: Record<string, Record<TeamRole, boolean>> = {
    "team.edit_identity": { captain: true, co_captain: false, member: false, reserve: false },
    "team.edit_profile": { captain: true, co_captain: true, member: false, reserve: false },
    "invite.manage": { captain: true, co_captain: true, member: false, reserve: false },
    "request.decide": { captain: true, co_captain: true, member: false, reserve: false },
  };
  for (const [action, expected] of Object.entries(table)) {
    for (const role of ROLES) {
      it(`${role} ${expected[role] ? "may" : "may not"} ${action}`, () => {
        expect(can(role, action as TeamAction)).toBe(expected[role]);
      });
    }
  }
});

describe("can() — actions on another member", () => {
  // [actor, action, target, allowed]
  const cases: [TeamRole, TeamAction, TeamRole, boolean][] = [
    // kick
    ["captain", "member.kick", "co_captain", true],
    ["captain", "member.kick", "member", true],
    ["captain", "member.kick", "reserve", true],
    ["captain", "member.kick", "captain", false],
    ["co_captain", "member.kick", "member", true],
    ["co_captain", "member.kick", "reserve", true],
    ["co_captain", "member.kick", "co_captain", false],
    ["co_captain", "member.kick", "captain", false],
    ["member", "member.kick", "reserve", false],
    ["reserve", "member.kick", "member", false],
    // set_role
    ["captain", "member.set_role", "member", true],
    ["captain", "member.set_role", "co_captain", true],
    ["captain", "member.set_role", "captain", false],
    ["co_captain", "member.set_role", "member", false],
    ["member", "member.set_role", "reserve", false],
    // transfer
    ["captain", "captain.transfer", "co_captain", true],
    ["captain", "captain.transfer", "reserve", true],
    ["captain", "captain.transfer", "captain", false],
    ["co_captain", "captain.transfer", "member", false],
  ];
  it.each(cases)("%s %s → %s = %s", (actor, action, target, allowed) => {
    expect(can(actor, action, target)).toBe(allowed);
  });
});

describe("can() — non-members", () => {
  it.each([null, undefined])("%s may do nothing", (actor) => {
    for (const a of ["team.edit_identity", "invite.manage", "member.kick"] as TeamAction[]) {
      expect(can(actor, a, "member")).toBe(false);
    }
  });

  it("kick/transfer without a target are denied", () => {
    expect(can("captain", "member.kick")).toBe(false);
    expect(can("captain", "captain.transfer")).toBe(false);
  });
});
