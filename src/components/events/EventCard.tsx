import Link from "next/link";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import type { EventRow } from "@/lib/events/queries";
import type { EventPhase } from "@/lib/events/timing";
import { ArenaBadge, isArenaUrl } from "./ArenaBadge";
import { Countdown } from "./Countdown";
import { LocalTime } from "./LocalTime";
import { PhaseBadge } from "./PhaseBadge";

export function kindLabel(e: Pick<EventRow, "kind" | "format">) {
  return e.kind === "ctf" ? `ctf${e.format ? ` / ${e.format}` : ""}` : "community";
}

export function EventCard({ e, phase, ownerTag, ownerLogo, teams }: { e: EventRow; phase: EventPhase; ownerTag: string | null; ownerLogo: string | null; teams: number }) {
  return (
    <Link href={`/events/${e.slug}`} className="block rounded border border-line bg-bg-deep/60 p-4 transition-colors hover:border-green-bright">
      <div className="flex flex-wrap items-center gap-2">
        <PhaseBadge phase={phase} />
        <span className="font-mono text-xs text-fg-muted">{kindLabel(e)}</span>
        {isArenaUrl(e.url) && <ArenaBadge />}
        {e.hiddenAt && <span className="font-mono text-xs text-red-bright">hidden</span>}
      </div>
      <h3 className="mt-2 text-lg text-fg">{e.title}</h3>
      <p className="mt-1 text-sm text-fg-muted">
        <LocalTime iso={e.startsAt.toISOString()} /> to <LocalTime iso={e.endsAt.toISOString()} />
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
        {phase === "upcoming" && <Countdown targetIso={e.startsAt.toISOString()} prefix="starts in" />}
        {phase === "live" && <Countdown targetIso={e.endsAt.toISOString()} prefix="ends in" />}
        {e.kind === "ctf" && <span>{teams === 1 ? "1 team" : `${teams} teams`}</span>}
        {ownerTag && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            <EmblemBadge emblem={ownerLogo} size={18} /> added by {ownerTag}
          </span>
        )}
      </div>
    </Link>
  );
}
