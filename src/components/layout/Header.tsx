import Link from "next/link";
import { PaletteButton } from "@/components/palette/PaletteButton";
import { FxToggle } from "./FxToggle";
import { AuthControls } from "./AuthControls";
import { MobileNav, NavLinks } from "./NavLinks";
import { getDict, localePath, type Lang } from "@/lib/i18n";
import { NAV } from "@/lib/site/nav";

/**
 * Server component: the dictionary is read here and only the strings the client pieces need go
 * down as props, so neither dictionary is bundled for the client.
 */
export function Header({ lang }: { lang: Lang }) {
  const t = getDict(lang).chrome;
  const items = NAV.map((n) => ({ href: n.href, label: t.nav[n.id] }));
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-line bg-bg/75 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={localePath(lang, "/")} className="group flex items-center gap-2.5 text-fg">
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

        <nav aria-label={t.mainNav} className="ms-auto hidden md:block">
          <NavLinks items={items} />
        </nav>

        <div className="ms-auto flex items-center gap-2 sm:gap-3 md:ms-2">
          <PaletteButton label={t.palette.open} />
          <div className="hidden sm:block">
            <FxToggle t={t.fx} />
          </div>
          <AuthControls t={{ signIn: t.signIn, join: t.join, dossier: t.dossier, myWriteups: t.myWriteups, bookmarks: t.bookmarks }} />
          <MobileNav items={items} t={{ menu: t.menu, mainNav: t.mainNav, fx: t.fx }} />
        </div>
      </div>
    </header>
  );
}
