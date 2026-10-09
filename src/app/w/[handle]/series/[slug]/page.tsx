import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { getDb } from "@/lib/db/client";
import { users, writeupSeries, writeups } from "@/lib/db/schema";
import { requestNow } from "@/lib/events/clock";
import { loadWriteupViewer } from "@/lib/writeups/viewer";
import { listWhere } from "@/lib/writeups/visibility";

export const metadata: Metadata = { title: "Series" };

export default async function SeriesPage({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  await connection();
  const { handle, slug } = await params;
  if (!/^[a-z0-9_-]{2,32}$/i.test(handle) || !/^[a-z0-9-]{1,90}$/.test(slug)) notFound();
  const db = getDb();
  const author = await db.query.users.findFirst({ columns: { id: true, handle: true }, where: eq(users.handle, handle.toLowerCase()) });
  if (!author) notFound();
  const series = await db.query.writeupSeries.findFirst({ where: and(eq(writeupSeries.authorId, author.id), eq(writeupSeries.slug, slug)) });
  if (!series) notFound();
  const viewer = await loadWriteupViewer(db);
  const parts = await db
    .select({ slug: writeups.slug, title: writeups.title, order: writeups.seriesOrder })
    .from(writeups)
    .where(and(eq(writeups.seriesId, series.id), listWhere(viewer, new Date(requestNow()))))
    .orderBy(asc(writeups.seriesOrder), asc(writeups.publishedAt));
  if (parts.length === 0 && viewer.userId !== author.id) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <p className="font-mono text-sm text-fg-muted">series by @{author.handle}</p>
      <CursorHeading level={1} prompt="#" className="mt-2">{series.title}</CursorHeading>
      <ol className="mt-8 space-y-3">
        {parts.map((p, i) => (
          <li key={p.slug} className="flex gap-3">
            <span className="font-mono text-fg-muted">{p.order ?? i + 1}.</span>
            <Link href={`/w/${author.handle}/${p.slug}`} className="text-fg hover:text-green-bright">{p.title}</Link>
          </li>
        ))}
      </ol>
    </article>
  );
}
