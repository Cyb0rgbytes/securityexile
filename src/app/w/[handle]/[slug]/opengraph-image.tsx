import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { ogCard, ogSize } from "@/lib/og/card";
import { findWriteupByHandleSlug } from "@/lib/writeups/queries";
import { canRead, isLocked } from "@/lib/writeups/visibility";

export const alt = "Security Exile writeup";
export const size = ogSize;
export const contentType = "image/png";

const valid = (h: string, s: string) => /^[a-z0-9_-]{2,32}$/i.test(h) && /^[a-z0-9-]{1,80}$/.test(s);

export default async function Image({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const found = valid(handle, slug) ? await findWriteupByHandleSlug(getDb(), handle, slug) : null;
  const now = requestNow();
  // Judged as an anonymous reader: drafts, hidden and spoiler-locked writeups get the generic card.
  const open = found && canRead(found.w, { userId: null, teamId: null, platformRole: "member" }, now) && !isLocked(found.w, now) && !found.w.hiddenAt;
  if (!open) return ogCard({ kicker: "writeup", title: "Writeups on Security Exile" });
  const { w } = found;
  return ogCard({
    kicker: [w.category, w.difficulty].filter(Boolean).join(" / ") || "writeup",
    title: w.title,
    meta: `by @${found.authorHandle} · ▲ ${w.voteCount} · ♥ ${w.heartCount}`,
  });
}
