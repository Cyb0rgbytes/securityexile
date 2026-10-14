import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import { ArenaBadge, isArenaUrl } from "@/components/events/ArenaBadge";
import { Countdown } from "@/components/events/Countdown";
import { kindLabel } from "@/components/events/EventCard";
import { LocalTime } from "@/components/events/LocalTime";
import { PhaseBadge } from "@/components/events/PhaseBadge";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { actorFor, canSeeEvent, loadViewer } from "@/lib/events/context";
import { canEvent, deleteAllowed } from "@/lib/events/permissions";
import { findEventBySlug, listRegisteredTeams } from "@/lib/events/queries";
import { eventPhase, registrationOpen } from "@/lib/events/timing";
import { slugParamSchema } from "@/lib/events/validation";
import { listRoster } from "@/lib/teams/queries";
import { ShareButton } from "@/components/share/ShareButton";
import { eq } from "drizzle-orm";
import { teams, users } from "@/lib/db/schema";
import { WriteupCard } from "@/components/writeups/WriteupCard";
import { listWriteups } from "@/lib/writeups/queries";
import { loadWriteupViewer } from "@/lib/writeups/viewer";
import { DeleteEventForm, HideToggle, RegisterButton, RosterForm, UnregisterForm } from "./EventActions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slugParamSchema.safeParse(slug).success) return { title: "Event" };
  const db = getDb();
  const [event, viewer] = await Promise.all([findEventBySlug(db, slug), loadViewer(db)]);
  if (!event || !canSeeEvent(event, viewer)) return { title: "Event" };
  const description = (event.description ?? `${event.kind === "ctf" ? "CTF" : "Community event"} on Security Exile.`).slice(0, 200);
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, type: "website" },
    robots: event.hiddenAt ? { index: false } : undefined,
  };
}

export default async function EventPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  if (!slugParamSchema.safeParse(slug).success) notFound();
  const db = getDb();
  const [event, viewer] = await Promise.all([findEventBySlug(db, slug), loadViewer(db)]);
  if (!event || !canSeeEvent(event, viewer)) notFound();

  const now = requestNow();
  const phase = eventPhase(event, now);
  const actor = actorFor(viewer, event);
  const regOpen = registrationOpen(event, now);
  const registered = event.kind === "ctf" ? await listRegisteredTeams(db, event.id) : [];
  // listWriteups applies the spoiler lock: outsiders see nothing until the event ends.
  const eventWriteups = await listWriteups(db, { viewer: await loadWriteupViewer(db), now: new Date(now), tab: "top", eventId: event.id, limit: 20 });
  const mine = viewer.team ? registered.find((r) => r.teamId === viewer.team!.id) : undefined;
  // "Other" means anyone but the hosting team; for a personal event every registration counts.
  const othersRegistered = registered.filter((r) => r.teamId !== event.ownerTeamId).length;
  const canRoster = !!mine && canEvent(actor, "event.roster");
  const roster = canRoster ? await listRoster(db, viewer.team!.id) : [];
  const host = event.ownerTeamId
    ? await db.query.teams.findFirst({ columns: { tag: true, name: true, logoKey: true }, where: eq(teams.id, event.ownerTeamId) })
    : null;
  const hostMember = !host && event.createdBy ? await db.query.users.findFirst({ columns: { handle: true }, where: eq(users.id, event.createdBy) }) : null;

  return (
    <article className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <PhaseBadge phase={phase} />
        <span className="font-mono text-xs text-fg-muted">{event.kind === "ctf" ? kindLabel(event) : "community event"}</span>
        {isArenaUrl(event.url) && <ArenaBadge />}
        {event.hiddenAt && <span className="font-mono text-xs text-red-bright">hidden from the board</span>}
      </div>
      <CursorHeading level={1} prompt="#" className="mt-3">
        {event.title}
      </CursorHeading>
      <p className="mt-4 text-fg-muted">
        <LocalTime iso={event.startsAt.toISOString()} /> to <LocalTime iso={event.endsAt.toISOString()} />{" "}
        {phase === "upcoming" && <Countdown targetIso={event.startsAt.toISOString()} prefix="· starts in" />}
        {phase === "live" && <Countdown targetIso={event.endsAt.toISOString()} prefix="· ends in" />}
      </p>
      {event.url && (
        <p className="mt-2">
          <a href={event.url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-green-bright underline-offset-4 hover:underline">
            {event.url}
          </a>
        </p>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
        {host ? (
          <>hosted by <EmblemBadge emblem={host.logoKey} size={18} /> <Link href={`/teams/${host.tag}`} className="text-fg hover:text-green-bright">{host.name}</Link></>
        ) : (
          hostMember?.handle && <>hosted by <Link href={`/u/${hostMember.handle}`} className="text-fg hover:text-green-bright">@{hostMember.handle}</Link></>
        )}
      </p>
      {event.description && <p className="mt-6 whitespace-pre-line text-fg">{event.description}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {mine && <NeonButton href={`/events/${event.slug}/war-room`}>open war room</NeonButton>}
        {!mine && event.kind === "ctf" && regOpen && canEvent(actor, "event.register") && <RegisterButton slug={event.slug} />}
        {!viewer.member && event.kind === "ctf" && regOpen && (
          <NeonButton href="/sign-in" variant="ghost">
            sign in to register your team
          </NeonButton>
        )}
        {canEvent(actor, "event.edit") && (
          <NeonButton href={`/events/${event.slug}/edit`} variant="ghost">
            edit event
          </NeonButton>
        )}
        {canEvent(actor, "event.delete") && deleteAllowed(phase, othersRegistered) && <DeleteEventForm slug={event.slug} />}
        {canEvent(actor, "event.hide") && <HideToggle slug={event.slug} hidden={!!event.hiddenAt} />}
        {!event.hiddenAt && <ShareButton title={event.title} text={`Join ${event.title} on Security Exile`} />}
      </div>

      {canRoster && (
        <GlassPanel className="mt-8 space-y-4 p-6">
          <RosterForm slug={event.slug} members={roster.map((r) => ({ userId: r.userId, handle: r.handle }))} roster={mine!.roster} />
          {regOpen && <UnregisterForm slug={event.slug} tag={viewer.team!.tag} />}
        </GlassPanel>
      )}

      {event.kind === "ctf" && (
        <section className="mt-10">
          <h2 className="font-mono text-green">registered teams ({registered.length})</h2>
          {registered.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">No teams yet.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {registered.map((t) => (
                <li key={t.teamId}>
                  <Link href={`/teams/${t.tag}`} className="flex items-center gap-3 rounded border border-line p-2 hover:border-green-bright">
                    <EmblemBadge emblem={t.logoKey} size={28} />
                    <span className="font-mono text-sm text-fg">{t.tag}</span>
                    <span className="truncate text-sm text-fg-muted">{t.name}</span>
                    {t.roster.length > 0 && <span className="ml-auto font-mono text-xs text-fg-muted">{t.roster.length} playing</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-mono text-green">writeups ({eventWriteups.length})</h2>
        {eventWriteups.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">{phase === "past" ? "No writeups yet." : "Writeups appear here after the event ends."}</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {eventWriteups.map((w) => (
              <WriteupCard key={w.id} w={w} now={now} />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
