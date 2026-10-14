import { getDb } from "@/lib/db/client";
import { findEventBySlug } from "@/lib/events/queries";
import { slugParamSchema } from "@/lib/events/validation";
import { ogCard, ogSize } from "@/lib/og/card";

export const alt = "Security Exile event";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Crawlers are anonymous: hidden events get the generic card, never their title.
  const event = slugParamSchema.safeParse(slug).success ? await findEventBySlug(getDb(), slug) : null;
  if (!event || event.hiddenAt) return ogCard({ kicker: "event", title: "Events on Security Exile" });
  const when = event.startsAt.toISOString().slice(0, 10);
  return ogCard({ kicker: event.kind === "ctf" ? `ctf${event.format ? ` / ${event.format}` : ""}` : "community event", title: event.title, meta: `starts ${when} (UTC)` });
}
