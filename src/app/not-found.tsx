import { GlitchText } from "@/components/fx/GlitchText";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-24 text-center sm:px-6">
      <div className="relative">
        <span
          aria-hidden="true"
          className="kanji pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 select-none text-[11rem] text-fg/[0.06] sm:text-[14rem]"
        >
          影
        </span>
        <p className="font-display text-7xl font-bold text-red sm:text-8xl">
          <GlitchText boot>404</GlitchText>
        </p>
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold text-fg">Lost in the shadows.</h1>
      <GlassPanel className="mt-8 w-full p-5 text-left font-mono text-sm">
        <p>
          <span className="text-green">$</span> cd {"<requested-path>"}
        </p>
        <p className="mt-1 text-fg-muted">bash: cd: no such file or directory</p>
        <p className="mt-1 text-fg-muted">
          hint: this isn&apos;t one of the hidden flags. keep looking.
        </p>
      </GlassPanel>
      <div className="mt-8">
        <NeonButton href="/">Back to the dojo</NeonButton>
      </div>
    </section>
  );
}
