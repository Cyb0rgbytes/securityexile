import { apexUrl } from "@/lib/site/hosts";
import { ar } from "./ar";
import { en, type Dict } from "./en";

export type Lang = "en" | "ar";
export type { Dict };

const DICTS: Record<Lang, Dict> = { en, ar };

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
}

/** Path of the same page in the other language: "/terms" ↔ "/ar/terms", "/" ↔ "/ar". */
export function altPath(lang: Lang, path: string): string {
  if (lang === "ar") return path.replace(/^\/ar(?=\/|$)/, "") || "/";
  return path === "/" ? "/ar" : `/ar${path}`;
}

/** The language a path is served in. src/proxy.ts passes this to the root layout as x-lang. */
export function langFromPath(path: string): Lang {
  return /^\/ar(\/|$)/.test(path) ? "ar" : "en";
}

/**
 * Canonical and hreflang for a bilingual page, given that page's own path. Absolute so they
 * resolve against the public site instead of metadataBase.
 */
export function apexAlternates(lang: Lang, path: string) {
  const other = altPath(lang, path);
  return {
    canonical: apexUrl(path),
    languages: {
      en: apexUrl(lang === "en" ? path : other),
      ar: apexUrl(lang === "ar" ? path : other),
    },
  };
}
