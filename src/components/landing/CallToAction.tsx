import { NeonButton } from "@/components/ui/NeonButton";
import { DISCORD_INVITE_URL } from "@/lib/links";

export function CallToAction() {
  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
      <div className="notch relative grid items-center gap-10 overflow-hidden border border-line bg-bg-deep/85 px-6 py-14 [--se-notch:22px] sm:px-12 sm:py-16 md:grid-cols-[1fr_auto]">
        {/* A vermilion cut along the top edge. */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--se-red),transparent_60%)]" />
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-5xl">
            Start learning.
            <br />
            Then teach someone.
          </h2>
          <p className="mt-5 max-w-md text-fg-muted">
            Sign in with Discord or GitHub, claim a handle, and your dossier starts filling in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <NeonButton href="/sign-up" variant="danger">
              Create account
            </NeonButton>
            <NeonButton href="/writeups" variant="ghost">
              Read a writeup
            </NeonButton>
            <NeonButton href={DISCORD_INVITE_URL} variant="ghost">
              Join the Discord
            </NeonButton>
          </div>
        </div>
        {/* The community crest, held like a mon on a banner. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/brand/falcon-480.webp"
          alt="Security Exile crest: a falcon with a fingerprint in the colours of the UAE flag"
          width={480}
          height={445}
          loading="lazy"
          className="mx-auto w-48 opacity-90 drop-shadow-[0_0_40px_rgb(34_211_180/0.25)] sm:w-60 md:mx-0"
        />
      </div>
    </section>
  );
}
