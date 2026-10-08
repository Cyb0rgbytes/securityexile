import { NeonButton } from "@/components/ui/NeonButton";

const HEADLINE = (
  <>
    Learn security
    <br />
    by doing.
  </>
);

/**
 * Landing hero. The backdrop's rooftop figure is the image; the copy holds
 * the dark left side. On load the headline is cut along a diagonal and the
 * halves snap together, then the seal stamps in (.blade-* / .hanko-stamp in
 * globals.css; static in low-FX and under reduced motion).
 */
export function Hero() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl overflow-x-clip flex-col justify-center px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <div className="blade-title inline-block pr-10 sm:pr-16">
          <h1 className="relative font-display text-[2.6rem] font-bold leading-[0.98] tracking-tight text-fg sm:text-7xl xl:text-[5.4rem]">
            <span className="blade-a">{HEADLINE}</span>
            <span className="blade-b" aria-hidden="true">
              {HEADLINE}
            </span>
          </h1>
          <span aria-hidden="true" className="blade-streak" />
          <span aria-hidden="true" className="hanko hanko-stamp absolute -top-14 right-0 h-12 sm:top-0 text-2xl sm:h-16 sm:text-4xl">
            忍
          </span>
        </div>

        <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-transparent [-webkit-text-stroke:1px_var(--se-fg)] sm:text-4xl">
          Write it up. Level up.
        </p>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-muted">
          A knowledge base written by its members: walkthroughs, research notes and writeups,
          from first steps to advanced tradecraft. Track your skills, form study teams, and
          practise together in CTFs when you want to.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <NeonButton href="/writeups">Browse writeups</NeonButton>
          <NeonButton href="/sign-up" variant="ghost">
            Join the community
          </NeonButton>
        </div>
      </div>
    </section>
  );
}
