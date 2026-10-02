import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Countdown } from "@/components/events/Countdown";
import { PhaseBadge } from "@/components/events/PhaseBadge";
import { requestNow } from "@/lib/events/clock";
import { listChallenges } from "@/lib/events/queries";
import { eventPhase, WAR_ROOM_GRACE_MS } from "@/lib/events/timing";
import { loadWarRoom } from "@/lib/events/war-room";
import { AddChallenge } from "./AddChallenge";
import { AutoRefresh } from "./AutoRefresh";
import { Board } from "./Board";
import type { CardData } from "./ChallengeCard";
import { NotesPanel } from "./NotesPanel";

export const metadata: Metadata = { title: "War room", robots: { index: false } };

export default async function WarRoomPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cat?: string }> }) {
  await connection();
  const { slug } = await params;
  const { cat } = await searchParams;
  const ctx = await loadWarRoom(slug, { forWrite: false });
  if ("error" in ctx) notFound();
  const { db, member, event, team, teamRole, registration, writable } = ctx;
  const rows = await listChallenges(db, event.id, team.id);
  const isLead = teamRole === "captain" || teamRole === "co_captain";
  const cards: CardData[] = rows
    .filter((r) => !cat || r.c.category === cat)
    .map(({ c, claimer }) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      points: c.points,
      status: c.status,
      claimer,
      claimedByMe: c.claimedBy === member.id,
      createdByMe: c.createdBy === member.id,
      notes: c.notesMd ?? "",
      links: c.links,
    }));
  const solved = rows.filter((r) => r.c.status === "solved");
  const points = solved.reduce((sum, r) => sum + (r.c.points ?? 0), 0);
  const categories = [...new Set(rows.map((r) => r.c.category).filter((c): c is string => !!c))];
  const phase = eventPhase(event, requestNow());
  const base = `/events/${event.slug}/war-room`;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <AutoRefresh enabled={writable} />
      <div className="flex flex-wrap items-center gap-3">
        <PhaseBadge phase={phase} />
        {phase === "live" && (
          <span className="text-sm text-fg-muted">
            <Countdown targetIso={event.endsAt.toISOString()} prefix="ends in" />
          </span>
        )}
        <span className="font-mono text-sm text-fg-muted">
          team {team.tag}
          {registration.roster.length > 0 && ` · ${registration.roster.length} playing`}
        </span>
        <span className="ml-auto font-mono text-sm text-green-bright">
          {solved.length} solved · {points} pts
        </span>
      </div>
      <CursorHeading level={1} prompt="#" className="mt-2">
        {event.title}
      </CursorHeading>
      <p className="mt-1 text-sm">
        <Link href={`/events/${event.slug}`} className="text-fg-muted hover:text-green-bright">
          event page
        </Link>
      </p>
      {!writable && (
        <p role="status" className="mt-4 rounded border border-line-strong p-3 text-sm text-fg-muted">
          This war room is read-only: it closed {Math.round(WAR_ROOM_GRACE_MS / 3_600_000)} hours after the event ended.
        </p>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          {writable && (
            <GlassPanel className="p-4">
              <AddChallenge slug={event.slug} />
            </GlassPanel>
          )}
          {categories.length > 1 && (
            <nav aria-label="Category filter" className="flex flex-wrap gap-3 font-mono text-xs">
              <Link href={base} aria-current={!cat ? "page" : undefined} className={!cat ? "text-green-bright" : "text-fg-muted hover:text-fg"}>
                all
              </Link>
              {categories.map((c) => (
                <Link key={c} href={`${base}?cat=${encodeURIComponent(c)}`} aria-current={cat === c ? "page" : undefined} className={cat === c ? "text-green-bright" : "text-fg-muted hover:text-fg"}>
                  {c}
                </Link>
              ))}
            </nav>
          )}
          <Board slug={event.slug} cards={cards} isLead={isLead} writable={writable} />
        </div>
        <GlassPanel className="h-fit p-4">
          <NotesPanel slug={event.slug} notes={registration.notesMd ?? ""} updatedAt={registration.notesUpdatedAt?.getTime() ?? 0} writable={writable} />
        </GlassPanel>
      </div>
    </section>
  );
}
