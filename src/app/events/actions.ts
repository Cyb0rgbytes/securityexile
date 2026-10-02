"use server";

/*
 * Event + registration mutations. Same order as team actions:
 *   requireMember → load event + viewer team/role → canEvent() → Zod → write (+ audit in one batch) → revalidate.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { requireMember } from "@/lib/auth/member";
import { isStaff } from "@/lib/auth/platform";
import { getDb, getEnv, type Db } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { auditLog, challenges, eventRegistrations, events, teamMembers, writeups } from "@/lib/db/schema";
import { actorFor, type EventViewer } from "@/lib/events/context";
import { canEvent, deleteAllowed, type EventAction } from "@/lib/events/permissions";
import { findEventBySlug, findRegistration } from "@/lib/events/queries";
import { eventPhase, registrationOpen } from "@/lib/events/timing";
import { eventInputSchema, slugify, slugParamSchema, validateWindow } from "@/lib/events/validation";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { auditEntry } from "@/lib/teams/audit";
import { findMembershipOf } from "@/lib/teams/queries";
import type { ActionState } from "@/app/teams/actions";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Invalid input.";

function revalidateEvent(slug: string) {
  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);
}

/** Viewer from requireMember: actions always need a signed-in, onboarded member. */
async function actingViewer() {
  const member = await requireMember();
  const db = getDb();
  const membership = await findMembershipOf(db, member.id);
  const viewer: EventViewer = {
    member,
    team: membership?.team ?? null,
    teamRole: membership?.role ?? null,
    staff: isStaff(member.platformRole),
  };
  return { db, member, viewer };
}

async function authorizeEvent(slugRaw: string, action: EventAction) {
  const { db, member, viewer } = await actingViewer();
  const slug = slugParamSchema.safeParse(slugRaw);
  if (!slug.success) return { error: "Event not found." } as const;
  const event = await findEventBySlug(db, slug.data);
  if (!event) return { error: "Event not found." } as const;
  if (!canEvent(actorFor(viewer, event), action)) return { error: "You don't have permission to do that." } as const;
  return { db, member, viewer, event } as const;
}

function readEventForm(form: FormData) {
  return {
    title: String(form.get("title") ?? ""),
    kind: String(form.get("kind") ?? "ctf"),
    format: String(form.get("format") ?? ""),
    url: String(form.get("url") ?? ""),
    description: String(form.get("description") ?? ""),
    startsAt: form.get("startsAt"),
    endsAt: form.get("endsAt"),
  };
}

async function uniqueSlug(db: Db, title: string): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await findEventBySlug(db, candidate))) return candidate;
  }
  return `${base}-${newId().slice(-6).toLowerCase()}`;
}

// ---------------------------------------------------------------- events

export async function createEvent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db, member, viewer } = await actingViewer();
  const raw = readEventForm(form);
  const fields = { title: raw.title, format: raw.format, url: raw.url, description: raw.description };
  if (!viewer.team || !canEvent(actorFor(viewer, null), "event.create"))
    return { error: "Only team captains and co-captains can add events.", fields };
  const parsed = eventInputSchema.safeParse(raw);
  if (!parsed.success) return { error: firstIssue(parsed.error), fields };
  const v = parsed.data;
  const windowError = validateWindow(v.startsAt, v.endsAt, Date.now(), true);
  if (windowError) return { error: windowError, fields };

  const rl = await hit(getEnv().KV, `event-create:${member.id}`, LIMITS.eventCreate);
  if (!rl.ok) return { error: retryMessage(rl), fields };

  const id = newId();
  const slug = await uniqueSlug(db, v.title);
  await db.batch([
    db.insert(events).values({
      id,
      slug,
      title: v.title,
      kind: v.kind,
      format: v.format || null,
      url: v.url || null,
      description: v.description || null,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      createdBy: member.id,
      ownerTeamId: viewer.team.id,
    }),
    db.insert(auditLog).values(auditEntry({ teamId: viewer.team.id, actorId: member.id, action: "event.create", targetId: id, meta: { title: v.title } })),
  ]);
  revalidatePath("/events");
  redirect(`/events/${slug}`);
}

export async function updateEvent(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.edit");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event } = ctx;
  const now = Date.now();
  const raw = readEventForm(form);

  if (eventPhase(event, now) !== "upcoming") {
    // After the start only the end time (later only) and the link may change.
    const parsed = eventInputSchema.pick({ url: true, endsAt: true }).safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    if (parsed.data.endsAt.getTime() < event.endsAt.getTime()) return { error: "Once an event has started, its end can only move later." };
    const windowError = validateWindow(event.startsAt, parsed.data.endsAt, now, false);
    if (windowError) return { error: windowError };
    await db.batch([
      db.update(events).set({ url: parsed.data.url || null, endsAt: parsed.data.endsAt }).where(eq(events.id, event.id)),
      // Writeups tied to this event stay spoiler-locked until its (new) end.
      db.update(writeups).set({ spoilerUntil: parsed.data.endsAt }).where(eq(writeups.eventId, event.id)),
      db.insert(auditLog).values(auditEntry({ teamId: event.ownerTeamId, actorId: member.id, action: "event.update", targetId: event.id, meta: { title: event.title } })),
    ]);
  } else {
    const parsed = eventInputSchema.safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const v = parsed.data;
    const windowError = validateWindow(v.startsAt, v.endsAt, now, true);
    if (windowError) return { error: windowError };
    await db.batch([
      db
        .update(events)
        .set({ title: v.title, kind: v.kind, format: v.format || null, url: v.url || null, description: v.description || null, startsAt: v.startsAt, endsAt: v.endsAt })
        .where(eq(events.id, event.id)),
      db.update(writeups).set({ spoilerUntil: v.endsAt }).where(eq(writeups.eventId, event.id)),
      db.insert(auditLog).values(auditEntry({ teamId: event.ownerTeamId, actorId: member.id, action: "event.update", targetId: event.id, meta: { title: v.title } })),
    ]);
  }
  revalidateEvent(event.slug);
  redirect(`/events/${event.slug}`);
}

export async function deleteEvent(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.delete");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  if (String(form.get("confirm") ?? "") !== event.slug) return { error: `Type ${event.slug} to confirm.` };
  const [{ others }] = await db
    .select({ others: count() })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), ne(eventRegistrations.teamId, viewer.team!.id)));
  if (!deleteAllowed(eventPhase(event, Date.now()), others))
    return { error: "Events can only be deleted before they start and before other teams register." };
  await db.batch([
    // event_id becomes null via the FK; drop the lock with it.
    db.update(writeups).set({ spoilerUntil: null }).where(eq(writeups.eventId, event.id)),
    db.delete(events).where(eq(events.id, event.id)),
    db.insert(auditLog).values(auditEntry({ teamId: event.ownerTeamId, actorId: member.id, action: "event.delete", targetId: event.id, meta: { title: event.title } })),
  ]);
  revalidatePath("/events");
  redirect("/events");
}

export async function setEventHidden(slug: string, hidden: boolean): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.hide");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event } = ctx;
  await db.batch([
    db.update(events).set({ hiddenAt: hidden ? new Date() : null }).where(eq(events.id, event.id)),
    db.insert(auditLog).values(
      auditEntry({ teamId: null, actorId: member.id, action: hidden ? "event.hide" : "event.unhide", targetId: event.id, meta: { title: event.title } }),
    ),
  ]);
  revalidateEvent(event.slug);
  return { ok: hidden ? "Event hidden." : "Event restored." };
}

// ---------------------------------------------------------------- registration

export async function registerTeam(slug: string): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.register");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  if (event.hiddenAt) return { error: "Event not found." };
  if (!registrationOpen(event, Date.now())) return { error: "Registration is closed for this event." };
  const team = viewer.team!;
  await db.batch([
    db.insert(eventRegistrations).values({ eventId: event.id, teamId: team.id, roster: [], registeredBy: member.id }).onConflictDoNothing(),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "event.register", targetId: event.id, meta: { title: event.title } })),
  ]);
  revalidateEvent(event.slug);
  return { ok: `${team.tag} is registered.` };
}

export async function unregisterTeam(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.register");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  const team = viewer.team!;
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== team.tag) return { error: `Type ${team.tag} to confirm.` };
  if (!registrationOpen(event, Date.now())) return { error: "This event has ended; the registration can't change." };
  await db.batch([
    db.delete(challenges).where(and(eq(challenges.eventId, event.id), eq(challenges.teamId, team.id))),
    db.delete(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.teamId, team.id))),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "event.unregister", targetId: event.id, meta: { title: event.title } })),
  ]);
  revalidateEvent(event.slug);
  return { ok: "Withdrawn. The war room was cleared." };
}

export async function setRoster(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.roster");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  const team = viewer.team!;
  if (!(await findRegistration(db, event.id, team.id))) return { error: "Register the team first." };
  const picked = [...new Set(form.getAll("roster").map(String))].slice(0, 100);
  const memberIds = new Set(
    (await db.select({ id: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, team.id))).map((r) => r.id),
  );
  if (picked.some((id) => !memberIds.has(id))) return { error: "The roster can only include current team members." };
  await db.batch([
    db.update(eventRegistrations).set({ roster: picked }).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.teamId, team.id))),
    db.insert(auditLog).values(
      auditEntry({ teamId: team.id, actorId: member.id, action: "event.roster", targetId: event.id, meta: { title: event.title, count: picked.length } }),
    ),
  ]);
  revalidateEvent(event.slug);
  return { ok: `Roster saved (${picked.length} playing).` };
}
