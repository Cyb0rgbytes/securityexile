import { NeonButton } from "@/components/ui/NeonButton";
import type { Dict } from "@/lib/i18n";

/**
 * Landing hero. The backdrop's rooftop figure is the image; the copy holds
 * the dark start side. On load the headline is cut along a diagonal and the
 * halves snap together, then the seal stamps in (.blade-* / .hanko-stamp in
 * globals.css; static in low-FX and under reduced motion).
 */
export function Hero({ t }: { t: Dict }) {
  const headline = (
    <>
      {t.hero.headline[0]}
      <br />
      {t.hero.headline[1]}
    </>
  );
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl overflow-x-clip flex-col justify-center px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <div className="blade-title inline-block pe-10 sm:pe-16">
          <h1 className="relative font-display text-[2.6rem] font-bold leading-[0.98] tracking-tight text-fg sm:text-7xl xl:text-[5.4rem]">
            <span className="blade-a">{headline}</span>
            <span className="blade-b" aria-hidden="true">
              {headline}
            </span>
          </h1>
          <span aria-hidden="true" className="blade-streak" />
          <span aria-hidden="true" className="hanko hanko-stamp absolute -top-14 end-0 h-12 sm:top-0 text-2xl sm:h-16 sm:text-4xl">
            忍
          </span>
        </div>

        <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-transparent [-webkit-text-stroke:1px_var(--se-fg)] sm:text-4xl">
          {t.hero.tagline}
        </p>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-muted">{t.hero.body}</p>

        <div className="mt-9 flex flex-wrap gap-3">
          <NeonButton href="/writeups">{t.hero.browse}</NeonButton>
          <NeonButton href="/sign-up" variant="ghost">
            {t.hero.join}
          </NeonButton>
        </div>
      </div>
    </section>
  );
}
