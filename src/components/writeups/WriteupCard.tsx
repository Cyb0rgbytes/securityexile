import Link from "next/link";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import type { ListedWriteup } from "@/lib/writeups/queries";
import { readMinutesFromChars } from "@/lib/writeups/render";

export function WriteupCard({ w, now }: { w: ListedWriteup; now: number }) {
  const locked = w.spoilerUntil !== null && w.spoilerUntil.getTime() > now;
  return (
    <Link href={`/w/${w.authorHandle}/${w.slug}`} className="block rounded border border-line bg-bg-deep/60 p-4 transition-colors hover:border-green-bright">
      <p className="font-mono text-xs text-fg-muted">
        {[w.category, w.difficulty].filter(Boolean).join(" / ") || "writeup"} · {readMinutesFromChars(w.bodyChars)} min
        {locked && <span className="ml-2 text-red-bright">team only until the event ends</span>}
      </p>
      <h3 className="mt-1 text-lg text-fg">{w.title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-fg-muted">
        <span>@{w.authorHandle}</span>
        {w.teamTag && <span className="inline-flex items-center gap-1"><EmblemBadge emblem={w.teamLogo} size={16} /> {w.teamTag}</span>}
        {w.tags.map((t) => <span key={t}>#{t}</span>)}
        <span className="ml-auto">▲ {w.voteCount} · {w.commentCount} comments</span>
      </div>
    </Link>
  );
}
