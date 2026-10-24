import Link from "next/link";
import { altPath, type Lang } from "@/lib/i18n";

/** Link to the same page in the other language. `path` is this page's path. */
export function LanguageSwitch({ lang, path, className = "" }: { lang: Lang; path: string; className?: string }) {
  const other: Lang = lang === "en" ? "ar" : "en";
  return (
    <Link
      href={altPath(lang, path)}
      hrefLang={other}
      lang={other}
      className={`inline-flex min-h-11 items-center rounded border border-line-strong px-3 font-mono text-sm text-fg hover:border-green-bright hover:text-green-bright ${className}`}
    >
      {other === "ar" ? "العربية" : "English"}
    </Link>
  );
}
