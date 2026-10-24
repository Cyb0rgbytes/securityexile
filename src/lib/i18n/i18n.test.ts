import { describe, expect, it } from "vitest";
import { ar } from "./ar";
import { en } from "./en";
import { apexAlternates, altPath, langFromPath } from "./index";
import { LEGAL } from "./legal";

/** Every leaf path ("hero.headline.0", ...) in a nested object. */
function keys(o: unknown, prefix = ""): string[] {
  if (o === null || typeof o !== "object") return [prefix];
  return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("dictionaries", () => {
  it("ar has exactly the en keys", () => expect(keys(ar).sort()).toEqual(keys(en).sort()));
  it("no empty strings", () => {
    for (const d of [en, ar]) for (const k of keys(d)) expect(k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], d)).not.toBe("");
  });
  it("legal docs have the same sections in both languages", () => {
    for (const doc of Object.values(LEGAL)) {
      expect(doc.ar.sections.map((s) => s.id)).toEqual(doc.en.sections.map((s) => s.id));
    }
  });
});

describe("altPath", () => {
  it("maps between the language trees", () => {
    expect(altPath("en", "/")).toBe("/ar");
    expect(altPath("en", "/terms")).toBe("/ar/terms");
    expect(altPath("ar", "/ar")).toBe("/");
    expect(altPath("ar", "/ar/privacy")).toBe("/privacy");
  });
});

describe("langFromPath", () => {
  it("reads the language off the path", () => {
    expect(langFromPath("/ar")).toBe("ar");
    expect(langFromPath("/ar/terms")).toBe("ar");
    expect(langFromPath("/")).toBe("en");
    expect(langFromPath("/terms")).toBe("en");
  });
  it("does not treat other /ar-prefixed paths as Arabic", () => {
    expect(langFromPath("/arena")).toBe("en");
    expect(langFromPath("/archive/1")).toBe("en");
  });
});

describe("apexAlternates", () => {
  it("points canonical and hreflang at the public site, not the app host", () => {
    for (const url of Object.values(apexAlternates("ar", "/ar/terms"))) {
      expect(JSON.stringify(url)).toContain("https://securityexile.com");
      expect(JSON.stringify(url)).not.toContain("app.securityexile.com");
    }
  });
  it("canonical is the page's own URL and the pair is stable across languages", () => {
    const en = apexAlternates("en", "/terms");
    const ar = apexAlternates("ar", "/ar/terms");
    expect(en.canonical).toBe("https://securityexile.com/terms");
    expect(ar.canonical).toBe("https://securityexile.com/ar/terms");
    expect(en.languages).toEqual(ar.languages);
  });
  it("drops the trailing slash on the landing pair", () => {
    expect(apexAlternates("en", "/").canonical).toBe("https://securityexile.com");
    expect(apexAlternates("en", "/").languages.ar).toBe("https://securityexile.com/ar");
  });
});
