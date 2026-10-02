import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { EventForm } from "@/components/events/EventForm";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { actorFor, loadViewer } from "@/lib/events/context";
import { canEvent } from "@/lib/events/permissions";
import { findEventBySlug } from "@/lib/events/queries";
import { eventPhase } from "@/lib/events/timing";
import { slugParamSchema } from "@/lib/events/validation";
import { updateEvent } from "../../actions";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireMember();
  const { slug } = await params;
  if (!slugParamSchema.safeParse(slug).success) notFound();
  const db = getDb();
  const [event, viewer] = await Promise.all([findEventBySlug(db, slug), loadViewer(db)]);
  if (!event || !canEvent(actorFor(viewer, event), "event.edit")) notFound();
  const limited = eventPhase(event, requestNow()) !== "upcoming";
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        edit event
      </CursorHeading>
      <GlassPanel className="mt-8 p-6">
        <EventForm
          action={updateEvent.bind(null, event.slug)}
          limited={limited}
          submitLabel="save changes"
          defaults={{
            title: event.title,
            kind: event.kind,
            format: event.format ?? "",
            url: event.url ?? "",
            description: event.description ?? "",
            startsAt: event.startsAt.toISOString(),
            endsAt: event.endsAt.toISOString(),
          }}
        />
      </GlassPanel>
    </article>
  );
}
