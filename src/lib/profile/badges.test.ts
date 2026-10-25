import { describe, expect, it } from "vitest";
import { BADGES, badgeBySlug, earnedBadges, normalizePhrase } from "./badges";

describe("BADGES catalogue", () => {
  it("has unique slugs, since the slug is also the row id", () => {
    expect(new Set(BADGES.map((b) => b.slug)).size).toBe(BADGES.length);
  });
  it("gives every count-based badge a rule, and every secret badge none", () => {
    for (const b of BADGES) {
      if (b.secret) expect(b.earned).toBeUndefined();
      else expect(typeof b.earned).toBe("function");
    }
  });
  it("describes every badge, so the profile never renders a blank chip", () => {
    for (const b of BADGES) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(0);
    }
  });
});

describe("earnedBadges", () => {
  it("gives a new member nothing", () => {
    expect(earnedBadges({ writeups: 0, events: 0 })).toEqual([]);
  });
  it("awards at the threshold, not before", () => {
    expect(earnedBadges({ writeups: 1, events: 0 }).map((b) => b.slug)).toEqual(["first-writeup"]);
    expect(earnedBadges({ writeups: 4, events: 0 }).map((b) => b.slug)).toEqual(["first-writeup"]);
    expect(earnedBadges({ writeups: 5, events: 0 }).map((b) => b.slug)).toContain("writeups-5");
  });
  it("keeps the lower tiers when a higher one is reached", () => {
    const slugs = earnedBadges({ writeups: 25, events: 0 }).map((b) => b.slug);
    expect(slugs).toEqual(expect.arrayContaining(["first-writeup", "writeups-5", "writeups-25"]));
  });
  it("counts writeups and events independently", () => {
    const slugs = earnedBadges({ writeups: 0, events: 5 }).map((b) => b.slug);
    expect(slugs).toEqual(expect.arrayContaining(["first-event", "events-5"]));
    expect(slugs).not.toContain("first-writeup");
  });
  it("never returns a secret badge from counting", () => {
    const huge = earnedBadges({ writeups: 9999, events: 9999 });
    expect(huge.every((b) => !b.secret)).toBe(true);
  });
});

describe("normalizePhrase", () => {
  it("ignores case and surrounding space", () => {
    expect(normalizePhrase("  The Quiet One  ")).toBe("the quiet one");
  });
  it("collapses inner runs of whitespace, including newlines and tabs", () => {
    expect(normalizePhrase("the\tquiet   one\nlistens")).toBe("the quiet one listens");
  });
  it("leaves an already-clean phrase alone", () => {
    expect(normalizePhrase("the quiet one")).toBe("the quiet one");
  });
});

describe("secret badges", () => {
  it("exist, and are never awarded by counting", () => {
    const secrets = BADGES.filter((b) => b.secret);
    expect(secrets.length).toBeGreaterThan(0);
    for (const s of secrets) expect(s.earned).toBeUndefined();
  });
  it("are excluded from the visible catalogue count", () => {
    const visible = BADGES.filter((b) => !b.secret).length;
    expect(visible).toBeLessThan(BADGES.length);
  });
});

describe("badgeBySlug", () => {
  it("finds a known badge and nothing else", () => {
    expect(badgeBySlug("first-writeup")?.name).toBe("First light");
    expect(badgeBySlug("nope")).toBeUndefined();
  });
});
