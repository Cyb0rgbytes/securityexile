import type { Metadata } from "next";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { WriteupCard } from "@/components/writeups/WriteupCard";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { bookmarks } from "@/lib/db/schema";
import { requestNow } from "@/lib/events/clock";
import { listWriteups } from "@/lib/writeups/queries";
import { loadWriteupViewer } from "@/lib/writeups/viewer";

export const metadata: Metadata = { title: "Saved writeups", robots: { index: false } };

export default async function BookmarksPage() {
  await connection();
  const member = await requireMember();
  const db = getDb();
  const viewer = await loadWriteupViewer(db);
  const ids = (await db.select({ id: bookmarks.writeupId }).from(bookmarks).where(eq(bookmarks.userId, member.id)).limit(500)).map((r) => r.id);
  const now = requestNow();
  const list = await listWriteups(db, { viewer, now: new Date(now), tab: "newest", ids, limit: 500 });
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">saved</CursorHeading>
      {list.length === 0 ? <p className="mt-8 text-fg-muted">Writeups you save show up here.</p> : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">{list.map((w) => <WriteupCard key={w.id} w={w} now={now} />)}</div>
      )}
    </section>
  );
}
