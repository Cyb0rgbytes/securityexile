import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { NeonButton } from "@/components/ui/NeonButton";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { listMyWriteups } from "@/lib/writeups/queries";
import { isLocked } from "@/lib/writeups/visibility";

export const metadata: Metadata = { title: "My writeups", robots: { index: false } };

export default async function MyWriteupsPage() {
  await connection();
  const member = await requireMember();
  const rows = await listMyWriteups(getDb(), member.id);
  const now = requestNow();
  return (
    <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <CursorHeading level={1} prompt="#">my writeups</CursorHeading>
        <div className="ml-auto"><NeonButton href="/writeups/new">write one</NeonButton></div>
      </div>
      {rows.length === 0 ? <p className="mt-8 text-fg-muted">Nothing yet. Your drafts and published writeups will be listed here.</p> : (
        <ul className="mt-8 divide-y divide-line">
          {rows.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 py-3">
              <Link href={`/writeups/${w.id}/edit`} className="text-fg hover:text-green-bright">{w.title}</Link>
              <span className="font-mono text-xs text-fg-muted">
                {w.hiddenAt ? "hidden by a moderator" : !w.publishedAt ? "draft" : isLocked(w, now) ? "published · team only until the event ends" : "published"}
              </span>
              {w.publishedAt && <Link href={`/w/${member.handle}/${w.slug}`} className="ml-auto font-mono text-xs text-fg-muted hover:text-green-bright">view</Link>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
