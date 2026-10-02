import type { EventPhase } from "@/lib/events/timing";

const style: Record<EventPhase, string> = {
  live: "border-red/60 text-red-bright",
  upcoming: "border-green/50 text-green-bright",
  past: "border-line-strong text-fg-muted",
};

export function PhaseBadge({ phase }: { phase: EventPhase }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-xs ${style[phase]}`}>
      {phase === "live" && <span className="live-dot" aria-hidden="true" />}
      {phase}
    </span>
  );
}
