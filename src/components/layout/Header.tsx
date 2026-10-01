import Link from "next/link";
import { GlitchText } from "@/components/fx/GlitchText";
import { Kbd } from "@/components/ui/Kbd";
import { FxToggle } from "./FxToggle";

const NAV = [
  { href: "/writeups", label: "writeups" },
  { href: "/teams", label: "teams" },
  { href: "/events", label: "events" },
  { href: "/leaderboard", label: "ranks" },
];

export function Header() {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-line bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-mono text-sm font-bold tracking-widest text-fg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/falcon-64.webp"
            alt=""
            width={28}
            height={26}
            className="h-7 w-auto drop-shadow-[0_0_6px_rgb(0_196_106/0.6)]"
          />
          <GlitchText>SECURITY_EXILE</GlitchText>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1 font-mono text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded px-3 py-1.5 text-fg-muted transition-colors hover:bg-green/5 hover:text-green-bright"
                >
                  <span aria-hidden="true" className="text-green/60">./</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 md:ml-2">
          <span className="hidden items-center gap-1 text-xs text-fg-muted sm:flex" title="Command palette (coming soon)">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
          <FxToggle />
        </div>
      </div>
    </header>
  );
}
