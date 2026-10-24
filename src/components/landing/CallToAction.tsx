import { NeonButton } from "@/components/ui/NeonButton";
import type { Dict } from "@/lib/i18n";
import { DISCORD_INVITE_URL } from "@/lib/links";

export function CallToAction({ t }: { t: Dict }) {
  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
      <div className="notch relative grid items-center gap-10 overflow-hidden border border-line bg-bg-deep/85 px-6 py-14 [--se-notch:22px] sm:px-12 sm:py-16 md:grid-cols-[1fr_auto]">
        {/* A vermilion cut along the top edge, starting from the reading side. */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--se-red),transparent_60%)] rtl:bg-[linear-gradient(270deg,var(--se-red),transparent_60%)]" />
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-5xl">
            {t.cta.headline[0]}
            <br />
            {t.cta.headline[1]}
          </h2>
          <p className="mt-5 max-w-md text-fg-muted">{t.cta.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <NeonButton href="/sign-up" variant="danger">
              {t.cta.create}
            </NeonButton>
            <NeonButton href="/writeups" variant="ghost">
              {t.cta.read}
            </NeonButton>
            <NeonButton href={DISCORD_INVITE_URL} variant="ghost">
              {t.cta.discord}
            </NeonButton>
          </div>
        </div>
        {/* The community crest, held like a mon on a banner. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/brand/falcon-480.webp"
          alt={t.cta.crestAlt}
          width={480}
          height={445}
          loading="lazy"
          className="mx-auto w-48 opacity-90 drop-shadow-[0_0_40px_rgb(34_211_180/0.25)] sm:w-60 md:mx-0"
        />
      </div>
    </section>
  );
}
