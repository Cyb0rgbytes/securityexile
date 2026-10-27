import { apexUrl } from "@/lib/site/hosts";
import { ar } from "./ar";
import { en, type Dict } from "./en";
import { altPath, type Lang } from "./path";

export { altPath, langFromPath, localePath, type Lang } from "./path";
export type { Dict };

const DICTS: Record<Lang, Dict> = { en, ar };

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
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
