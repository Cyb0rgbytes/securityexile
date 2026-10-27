/**
 * Path helpers with no dictionary imports, so client components can use them without bundling
 * either language. Re-exported from ./index.
 */
export type Lang = "en" | "ar";

/** Path of the same page in the other language: "/terms" ↔ "/ar/terms", "/" ↔ "/ar". */
export function altPath(lang: Lang, path: string): string {
  if (lang === "ar") return path.replace(/^\/ar(?=\/|$)/, "") || "/";
  return path === "/" ? "/ar" : `/ar${path}`;
}

/** An English path as served in `lang`: "/terms" → "/ar/terms" for Arabic, unchanged for English. */
export function localePath(lang: Lang, path: string): string {
  return lang === "ar" ? altPath("en", path) : path;
}

/** The language a path is served in. src/proxy.ts passes this to the root layout as x-lang. */
export function langFromPath(path: string): Lang {
  return /^\/ar(\/|$)/.test(path) ? "ar" : "en";
}
