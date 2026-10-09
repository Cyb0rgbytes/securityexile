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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/brand/falcon-64.webp" alt="" width={28} height={26} className="h-7 w-auto" />
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
