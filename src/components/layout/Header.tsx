import Link from "next/link";
import { Kbd } from "@/components/ui/Kbd";
import { FxToggle } from "./FxToggle";
import { AuthControls } from "./AuthControls";
import { MobileNav, NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-line bg-bg/75 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 text-fg">
          {/* falcon-mark carries a baked pale rim: the plain artwork's charcoal wings vanish on the dark bar. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/brand/falcon-mark-128.webp" alt="" width={43} height={40} className="h-10 w-auto shrink-0 drop-shadow-[0_0_6px_rgb(34_211_180/0.35)]" />
          <span className="whitespace-nowrap font-display text-[0.8rem] font-bold uppercase tracking-[0.14em] sm:text-[0.95rem] sm:tracking-[0.18em]">
            Security<span className="text-fg-muted transition-colors group-hover:text-green-bright"> Exile</span>
          </span>
          <span aria-hidden="true" className="hanko hidden h-5 text-[0.7rem] sm:inline-grid">
            忍
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden md:block">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 md:ml-2">
          <span className="hidden items-center gap-1 text-xs text-fg-muted lg:flex" title="Command palette (coming soon)">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
          <div className="hidden sm:block">
            <FxToggle />
          </div>
          <AuthControls />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
