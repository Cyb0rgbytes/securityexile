import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { NeonButton } from "@/components/ui/NeonButton";
import { inputCls } from "@/components/teams/FormBits";
import { WriteupCard } from "@/components/writeups/WriteupCard";
import { DIFFICULTIES } from "@/lib/db/enums";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { FOCUS_CATEGORIES } from "@/lib/teams/validation";
import { listWriteups } from "@/lib/writeups/queries";
import { loadWriteupViewer } from "@/lib/writeups/viewer";

export const metadata: Metadata = { title: "Writeups", description: "Writeups, walkthroughs and research from the community." };

const TABS = ["trending", "newest", "top"] as const;
type Tab = (typeof TABS)[number];
type SP = { tab?: string; category?: string; level?: string; tag?: string; q?: string };

export default async function WriteupsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const db = getDb();
  const viewer = await loadWriteupViewer(db);
  const now = requestNow();
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "trending";
  const category = FOCUS_CATEGORIES.includes(sp.category as never) ? sp.category : undefined;
  const level = DIFFICULTIES.includes(sp.level as never) ? sp.level : undefined;
  const tag = sp.tag && /^[a-z0-9-]{2,24}$/.test(sp.tag) ? sp.tag : undefined;
  const q = sp.q?.trim().slice(0, 60) || undefined;
  const list = await listWriteups(db, { viewer, now: new Date(now), tab, category, difficulty: level, tag, q });
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ tab, category, level, tag, q, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/writeups?${p}`;
  };
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <CursorHeading level={1} prompt="#">writeups</CursorHeading>
        {viewer.userId && <div className="ml-auto"><NeonButton href="/writeups/new">write one</NeonButton></div>}
      </div>
      <nav aria-label="Sort" className="mt-8 flex flex-wrap gap-2 font-mono text-sm">
        {TABS.map((t) => (
          <Link key={t} href={qs({ tab: t })} aria-current={t === tab ? "page" : undefined}
            className={`rounded border px-3 py-1 ${t === tab ? "border-green-bright text-green-bright" : "border-line-strong text-fg-muted hover:text-fg"}`}>{t}</Link>
        ))}
      </nav>
      <form role="search" className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto]">
        <input type="hidden" name="tab" value={tab} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label htmlFor="q" className="sr-only">Search titles and tags</label>
        <input id="q" name="q" defaultValue={q} placeholder="search titles and tags" className={inputCls} />
        <label htmlFor="category" className="sr-only">Category</label>
        <select id="category" name="category" defaultValue={category ?? ""} className={inputCls}>
          <option value="">any category</option>
          {FOCUS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label htmlFor="level" className="sr-only">Level</label>
        <select id="level" name="level" defaultValue={level ?? ""} className={inputCls}>
          <option value="">any level</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button type="submit" className="rounded border border-line-strong px-4 py-2 font-mono text-sm text-fg hover:border-green-bright">filter</button>
      </form>
      {tag && <p className="mt-3 font-mono text-sm text-fg-muted">tag #{tag} · <Link href={qs({ tag: undefined })} className="text-green-bright">clear</Link></p>}
      {list.length === 0 ? (
        <p className="mt-10 text-fg-muted">No writeups match yet.{viewer.userId ? " Be the first: share what you learned from your last challenge." : " Sign in to write the first one."}</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">{list.map((w) => <WriteupCard key={w.id} w={w} now={now} />)}</div>
      )}
    </section>
  );
}
