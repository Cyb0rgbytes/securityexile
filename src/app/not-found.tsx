import { GlitchText } from "@/components/fx/GlitchText";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-24 text-center sm:px-6">
      <p className="font-mono text-7xl font-bold text-red text-glow sm:text-8xl">
        <GlitchText boot>404</GlitchText>
      </p>
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
        <NeonButton href="/">cd ~</NeonButton>
      </div>
    </section>
  );
}
