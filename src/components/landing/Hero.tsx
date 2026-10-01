import { TypingText } from "@/components/fx/TypingText";
import { NeonButton } from "@/components/ui/NeonButton";
import { HeroStage } from "@/components/three/HeroStage";

const STATS = [
  { label: "teams", value: "—" },
  { label: "writeups", value: "—" },
  { label: "events tracked", value: "—" },
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
      <div>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-cyan">
          <span aria-hidden="true">[ </span>ctf community platform<span aria-hidden="true"> ]</span>
        </p>
        <h1 className="font-mono text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-6xl">
          <TypingText text="Find your crew." />
          <br />
          <span className="cursor-blink text-neon text-glow">Capture the flag.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-fg-muted">
          Build a team, run your war room during live CTFs, and publish writeups that stay
          spoiler-locked until the clock hits zero.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <NeonButton href="/teams">./join --team</NeonButton>
          <NeonButton href="/writeups" variant="ghost">
            cat writeups/*
          </NeonButton>
        </div>
        <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6 font-mono">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt className="text-[0.7rem] uppercase tracking-wider text-fg-muted">{s.label}</dt>
              <dd className="mt-1 text-2xl text-cyan">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex justify-center lg:justify-end">
        <HeroStage />
      </div>
    </section>
  );
}
