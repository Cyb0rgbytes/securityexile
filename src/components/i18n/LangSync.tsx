"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { langFromPath, type Lang } from "@/lib/i18n/path";

/**
 * The root layout picks lang, dir and the chrome's language per request, but a client-side
 * navigation keeps the layout it already has. When a <Link> crosses between the English and
 * Arabic trees, refresh so the server renders the layout again for the new path.
 *
 * At most once per pathname: on the ctf./labs. holding hosts the proxy rewrites every path to an
 * English page, so the server's language can legitimately disagree with the path, and refreshing
 * until they match would never stop.
 */
export function LangSync({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const router = useRouter();
  const refreshed = useRef<string | null>(null);
  useEffect(() => {
    if (langFromPath(pathname) === lang || refreshed.current === pathname) return;
    refreshed.current = pathname;
    router.refresh();
  }, [pathname, lang, router]);
  return null;
}
