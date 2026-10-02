import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { NeonButton } from "@/components/ui/NeonButton";
import { EventCard } from "@/components/events/EventCard";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { actorFor, canSeeEvent, loadViewer } from "@/lib/events/context";
import { canEvent } from "@/lib/events/permissions";
import { listBoard } from "@/lib/events/queries";
import { eventPhase, type EventPhase } from "@/lib/events/timing";

export const metadata: Metadata = { title: "Events", description: "Upcoming CTFs and community events." };

const TABS: EventPhase[] = ["live", "upcoming", "past"];
const KINDS = [null, "ctf", "community"] as const;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ tab?: string; kind?: string }> }) {
  await connection();
  const sp = await searchParams;
  const db = getDb();
  const viewer = await loadViewer(db);
  const now = requestNow();
  const rows = await listBoard(db, { includeHidden: viewer.staff || !!viewer.team, now });
  const visible = rows.filter((r) => canSeeEvent(r.event, viewer)).map((r) => ({ ...r, phase: eventPhase(r.event, now) }));
  const counts = Object.fromEntries(TABS.map((t) => [t, visible.filter((r) => r.phase === t).length])) as Record<EventPhase, number>;
  const tab: EventPhase = TABS.includes(sp.tab as EventPhase) ? (sp.tab as EventPhase) : counts.live > 0 ? "live" : "upcoming";
  const kind = sp.kind === "ctf" || sp.kind === "community" ? sp.kind : null;
  const list = visible.filter((r) => r.phase === tab && (!kind || r.event.kind === kind));
  const canCreate = canEvent(actorFor(viewer, null), "event.create");

  const href = (t: EventPhase, k: string | null) => `/events?tab=${t}${k ? `&kind=${k}` : ""}`;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <CursorHeading level={1} prompt="#">
          events
        </CursorHeading>
        {canCreate && (
          <div className="ml-auto">
            <NeonButton href="/events/new">add an event</NeonButton>
          </div>
        )}
      </div>
      <nav aria-label="Event filters" className="mt-8 flex flex-wrap items-center gap-2 font-mono text-sm">
        {TABS.map((t) => (
          <Link
            key={t}
            href={href(t, kind)}
            aria-current={t === tab ? "page" : undefined}
            className={`rounded border px-3 py-1 ${t === tab ? "border-green-bright text-green-bright" : "border-line-strong text-fg-muted hover:text-fg"}`}
          >
            {t} ({counts[t]})
          </Link>
        ))}
        <span className="mx-2 text-line-strong" aria-hidden="true">
          |
        </span>
        {KINDS.map((k) => (
          <Link key={k ?? "all"} href={href(tab, k)} aria-current={k === kind ? "page" : undefined} className={k === kind ? "text-green-bright" : "text-fg-muted hover:text-fg"}>
            {k ?? "all"}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <p className="mt-10 text-fg-muted">
          {tab === "live" ? "Nothing is running right now." : tab === "upcoming" ? "No upcoming events yet." : "No past events yet."}{" "}
          {canCreate ? "Add one so the community can plan around it." : "Team captains and co-captains can add events."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <EventCard key={r.event.id} e={r.event} phase={r.phase} ownerTag={r.ownerTag} ownerLogo={r.ownerLogo} teams={r.teams} />
          ))}
        </div>
      )}
    </section>
  );
}
