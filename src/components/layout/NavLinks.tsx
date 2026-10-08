"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FxToggle } from "./FxToggle";

export const NAV = [
  { href: "/writeups", label: "Writeups" },
  { href: "/teams", label: "Teams" },
  { href: "/events", label: "Events" },
  { href: "/leaderboard", label: "Ranks" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop nav: a slash draws under the hovered and the current link. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1 font-display text-sm font-medium">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`slash-link block px-3 py-2 tracking-wide transition-colors hover:text-fg ${active ? "text-fg" : "text-fg-muted"}`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Phone nav. Keyed on the pathname so the disclosure remounts (and closes)
 * after a client-side navigation.
 */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <details key={pathname} className="group md:hidden">
      <summary
        className="notch notch-sm flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 font-display text-xs font-semibold text-fg shadow-[inset_0_0_0_1px_var(--se-line-strong)] [&::-webkit-details-marker]:hidden"
        aria-label="Menu"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2 4h12M2 8h9M2 12h12" className="group-open:hidden" />
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" className="hidden group-open:block" />
        </svg>
        Menu
      </summary>
      <nav
        aria-label="Main"
        className="absolute inset-x-0 top-full border-b border-line bg-bg-deep px-4 pb-4 pt-2 shadow-[0_24px_40px_-12px_rgb(0_0_0/0.7)]"
      >
        <ul className="font-display text-lg font-medium">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="border-b border-line last:border-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between py-3 ${active ? "text-green-bright" : "text-fg"}`}
                >
                  {item.label}
                  {active && <span aria-hidden="true" className="h-0.5 w-6 -skew-x-[35deg] bg-red" />}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between text-sm text-fg-muted">
          Visual effects
          <FxToggle />
        </div>
      </nav>
    </details>
  );
}
