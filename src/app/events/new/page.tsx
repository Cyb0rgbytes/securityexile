import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { EventForm } from "@/components/events/EventForm";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { canEvent } from "@/lib/events/permissions";
import { findMembershipOf } from "@/lib/teams/queries";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "Add an event" };

export default async function NewEventPage() {
  const member = await requireMember();
  const membership = await findMembershipOf(getDb(), member.id);
  if (!membership || !canEvent({ teamRole: membership.role, ownsEvent: false, platformRole: member.platformRole }, "event.create")) redirect("/events");
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        add an event
      </CursorHeading>
      <p className="mt-4 text-sm text-fg-muted">Your team ({membership.team.tag}) is listed as the organizer and can edit it later.</p>
      <GlassPanel className="mt-8 p-6">
        <EventForm action={createEvent} submitLabel="add event" />
      </GlassPanel>
    </article>
  );
}
