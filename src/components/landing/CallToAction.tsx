import { NeonButton } from "@/components/ui/NeonButton";

export function CallToAction() {
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-lg border border-line bg-bg-deep/80 px-6 py-14 text-center sm:px-10 sm:py-20">
        {/* Crest watermark, cropped and faint. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/brand/falcon-960.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-[12%] -top-[40%] w-[70%] max-w-[720px] opacity-[0.05] grayscale sm:-right-[6%]"
        />
        <h2 className="relative font-mono text-2xl font-bold tracking-tight text-fg sm:text-4xl">
          Start learning. Then teach someone.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-fg-muted">
          Sign in with Discord or GitHub, claim a handle, and your dossier starts filling in.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <NeonButton href="/sign-in" variant="danger">
            create account
          </NeonButton>
          <NeonButton href="/writeups" variant="ghost">
            read a writeup
          </NeonButton>
        </div>
      </div>
    </section>
  );
}
