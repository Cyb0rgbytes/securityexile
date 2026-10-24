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
