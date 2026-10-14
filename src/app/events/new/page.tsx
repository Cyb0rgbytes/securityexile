import type { Metadata } from "next";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { EventForm } from "@/components/events/EventForm";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { canHostAsTeam } from "@/lib/events/permissions";
import { findMembershipOf } from "@/lib/teams/queries";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "Add an event" };

export default async function NewEventPage() {
  const member = await requireMember();
  const membership = await findMembershipOf(getDb(), member.id);
  const teamTag = membership && canHostAsTeam(membership.role) ? membership.team.tag : undefined;
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        add an event
      </CursorHeading>
      <p className="mt-4 text-sm text-fg-muted">
        {teamTag
          ? "Host it as your team or as yourself. The host is shown on the event and can edit it later."
          : "You'll be listed as the host and can edit it later. Once it's up, share the link so others can join."}
      </p>
      <GlassPanel className="mt-8 p-6">
        <EventForm action={createEvent} submitLabel="add event" teamTag={teamTag} />
      </GlassPanel>
    </article>
  );
}
