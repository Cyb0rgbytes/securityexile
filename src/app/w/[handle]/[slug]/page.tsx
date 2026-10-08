import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import { Countdown } from "@/components/events/Countdown";
import { HideWriteup } from "@/components/writeups/WriteupActions";
import { isStaff } from "@/lib/auth/platform";
import { getDb } from "@/lib/db/client";
import { bookmarks, events, teams, votes, writeupSeries, writeups } from "@/lib/db/schema";
import { requestNow } from "@/lib/events/clock";
import { loadCommentTree } from "@/lib/writeups/comments";
import { canVote } from "@/lib/writeups/permissions";
import { findWriteupByHandleSlug, tagsOf } from "@/lib/writeups/queries";
import { readMinutes, tocFromHtml } from "@/lib/writeups/render";
import { loadWriteupViewer } from "@/lib/writeups/viewer";
import { canRead, isLocked, listWhere } from "@/lib/writeups/visibility";
import { Comments } from "./Comments";
import { Social } from "./Social";

type Props = { params: Promise<{ handle: string; slug: string }> };
const valid = (h: string, s: string) => /^[a-z0-9_-]{2,32}$/i.test(h) && /^[a-z0-9-]{1,80}$/.test(s);

async function load(handle: string, slug: string) {
  if (!valid(handle, slug)) return null;
  const db = getDb();
  const [found, viewer] = await Promise.all([findWriteupByHandleSlug(db, handle, slug), loadWriteupViewer(db)]);
  if (!found) return null;
  const now = requestNow();
  if (!canRead(found.w, viewer, now)) return null;
  return { db, viewer, now, ...found };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const r = await load(handle, slug);
  if (!r) return { title: "Writeup" };
  const locked = isLocked(r.w, r.now) || !r.w.publishedAt || !!r.w.hiddenAt;
  return { title: r.w.title, robots: locked ? { index: false } : undefined };
}

export default async function WriteupPage({ params }: Props) {
  await connection();
  const { handle, slug } = await params;
  const r = await load(handle, slug);
  if (!r) notFound();
  const { db, viewer, now, w, authorHandle } = r;
  const staff = isStaff(viewer.platformRole);
  const [tags, team, event, series, myVote, myMark, tree] = await Promise.all([
    tagsOf(db, w.id),
    w.teamId ? db.query.teams.findFirst({ columns: { tag: true, name: true, logoKey: true }, where: eq(teams.id, w.teamId) }) : null,
    w.eventId ? db.query.events.findFirst({ columns: { slug: true, title: true, endsAt: true }, where: eq(events.id, w.eventId) }) : null,
    w.seriesId ? db.query.writeupSeries.findFirst({ where: eq(writeupSeries.id, w.seriesId) }) : null,
    viewer.userId ? db.query.votes.findFirst({ where: and(eq(votes.writeupId, w.id), eq(votes.userId, viewer.userId)) }) : null,
    viewer.userId ? db.query.bookmarks.findFirst({ where: and(eq(bookmarks.writeupId, w.id), eq(bookmarks.userId, viewer.userId)) }) : null,
    loadCommentTree(db, w.id, { userId: viewer.userId, staff }, now),
  ]);
  const toc = tocFromHtml(w.bodyHtml);
  // Neighbours in the series, filtered by the same list rule so locked parts don't leak.
  const parts = series
    ? await db
        .select({ slug: writeups.slug, title: writeups.title })
        .from(writeups)
        .where(and(eq(writeups.seriesId, series.id), listWhere(viewer, new Date(now))))
        .orderBy(asc(writeups.seriesOrder), asc(writeups.publishedAt))
    : [];
  const idx = parts.findIndex((p) => p.slug === w.slug);
  const prev = idx > 0 ? parts[idx - 1] : null;
  const next = idx >= 0 && idx < parts.length - 1 ? parts[idx + 1] : null;
  const locked = isLocked(w, now);
  const isAuthor = viewer.userId === w.authorId;

  return (
    <article className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      {!w.publishedAt && <p role="status" className="mb-4 rounded border border-line-strong p-3 text-sm text-fg-muted">Draft: only you can see this.</p>}
      {w.hiddenAt && <p role="status" className="mb-4 rounded border border-red/50 p-3 text-sm text-red-bright">Hidden by a moderator.</p>}
      {locked && w.publishedAt && (
        <p role="status" className="mb-4 rounded border border-red/50 p-3 text-sm text-red-bright">
          Spoiler-locked: visible to {w.teamId ? "your team" : "you"} until {event?.title ?? "the event"} ends{" "}
          <Countdown targetIso={w.spoilerUntil!.toISOString()} prefix="in" />
        </p>
      )}
      <p className="font-mono text-xs text-fg-muted">
        {[w.category, w.difficulty].filter(Boolean).join(" / ") || "writeup"} · {readMinutes(w.bodyMd)} min read
        {series && <> · series: <Link href={`/w/${authorHandle}/series/${series.slug}`} className="hover:text-green-bright">{series.title}</Link>{w.seriesOrder ? ` (${w.seriesOrder})` : ""}</>}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{w.title}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
        by <Link href={`/u/${authorHandle}`} className="text-fg hover:text-green-bright">@{authorHandle}</Link>
        {team && <><EmblemBadge emblem={team.logoKey} size={18} /> <Link href={`/teams/${team.tag}`} className="hover:text-green-bright">{team.tag}</Link></>}
        {event && <> · <Link href={`/events/${event.slug}`} className="hover:text-green-bright">{event.title}</Link></>}
        {w.publishedAt && <> · <time dateTime={w.publishedAt.toISOString()}>{w.publishedAt.toISOString().slice(0, 10)}</time></>}
      </p>
      {tags.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
          {tags.map((t) => <Link key={t} href={`/writeups?tag=${t}`} className="rounded border border-line px-2 py-0.5 text-fg-muted hover:text-green-bright">#{t}</Link>)}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {w.publishedAt && (
          <Social writeupId={w.id} votes={w.voteCount} voted={!!myVote} saved={!!myMark} canVote={!!viewer.userId && canVote(w, viewer.userId)} signedIn={!!viewer.userId} />
        )}
        {isAuthor && <Link href={`/writeups/${w.id}/edit`} className="font-mono text-sm text-fg-muted hover:text-green-bright">edit</Link>}
        {staff && w.publishedAt && <HideWriteup id={w.id} hidden={!!w.hiddenAt} />}
      </div>
      {toc.length >= 3 && (
        <nav aria-label="Contents" className="mt-8 rounded border border-line p-4 text-sm">
          <p className="font-mono text-xs text-fg-muted">contents</p>
          <ul className="mt-2 space-y-1">
            {toc.map((h) => <li key={h.id} className={h.depth === 3 ? "pl-4" : ""}><a href={`#${h.id}`} className="text-fg-muted hover:text-green-bright">{h.text}</a></li>)}
          </ul>
        </nav>
      )}
      {/* body_html was produced by renderWriteup() (escape raw HTML → gate images → rehype-sanitize). */}
      <div className="prose-se mt-8" dangerouslySetInnerHTML={{ __html: w.bodyHtml }} />
      {(prev || next) && (
        <nav aria-label="Series" className="mt-10 flex justify-between gap-4 font-mono text-sm">
          {prev ? <Link href={`/w/${authorHandle}/${prev.slug}`} className="text-fg-muted hover:text-green-bright">← {prev.title}</Link> : <span />}
          {next && <Link href={`/w/${authorHandle}/${next.slug}`} className="text-right text-fg-muted hover:text-green-bright">{next.title} →</Link>}
        </nav>
      )}
      <Comments writeupId={w.id} tree={tree} signedIn={!!viewer.userId} staff={staff} open={!!w.publishedAt && !w.hiddenAt} />
    </article>
  );
}
