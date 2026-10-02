import { TypingText } from "@/components/fx/TypingText";
import { GlitchText } from "@/components/fx/GlitchText";
import { FalconCrest } from "@/components/fx/FalconCrest";
import { NeonButton } from "@/components/ui/NeonButton";

const STATS = [
  { label: "members", value: "—" },
  { label: "writeups", value: "—" },
  { label: "topics covered", value: "—" },
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-16">
      {/* Crest first on phones so the brand leads; copy leads on wide screens. */}
      <div className="flex justify-center lg:order-2 lg:justify-end">
        <FalconCrest className="w-[72vw] max-w-[520px]" />
      </div>

      <div className="lg:order-1">
        <p className="mb-5 font-mono text-sm text-green">
          <span aria-hidden="true">$ </span>cat README.md
        </p>
        <h1 className="font-mono text-4xl font-bold leading-[1.08] tracking-tight text-fg sm:text-5xl xl:text-[3.5rem]">
          <TypingText text="Learn security by doing." />
          <br />
          <GlitchText boot className="cursor-blink">
            Write it up. Level up.
          </GlitchText>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
          A knowledge base written by its members: walkthroughs, research notes and writeups,
          from first steps to advanced tradecraft. Track your skills, form study teams, and
          practise together in CTFs when you want to.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <NeonButton href="/writeups">browse writeups</NeonButton>
          <NeonButton href="/sign-up" variant="ghost">
            join the community
          </NeonButton>
        </div>
        <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6 font-mono">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-fg-muted">{s.label}</dt>
              <dd className="mt-1 text-2xl text-green-bright">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
