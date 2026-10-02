import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

/** Placeholder for sections linked from the nav that haven't shipped yet. */
export function ComingSoon({ title, dir, lines }: { title: string; dir: string; lines: string[] }) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        {title}
      </CursorHeading>
      <GlassPanel className="mt-8 p-5 font-mono text-sm leading-7">
        <p>
          <span className="text-green">$</span> ls {dir}/
        </p>
        <p className="text-fg-muted">{dir}/ is still being built. Here&apos;s what&apos;s coming:</p>
        <ul className="mt-2 text-fg-muted">
          {lines.map((l) => (
            <li key={l}>
              <span className="text-green">+</span> {l}
            </li>
          ))}
        </ul>
      </GlassPanel>
      <div className="mt-8 flex flex-wrap gap-3">
        <NeonButton href="/teams">browse teams</NeonButton>
        <NeonButton href="/" variant="ghost">
          back home
        </NeonButton>
      </div>
    </article>
  );
}
