import { describe, expect, it } from "vitest";
import { ar } from "./ar";
import { en } from "./en";
import { altPath } from "./index";
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
