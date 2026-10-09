"use server";

/*
 * Team mutations. Every action follows the same order:
 *   requireMember → load team + actor role from the DB → can() → Zod →
 *   write (+ audit row in the same batch) → revalidate.
 * Inputs from the client (ids, roles, tags) are never trusted for authorization.
 */
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { requireMember, type OnboardedMember } from "@/lib/auth/member";
import { getDb, getEnv, getSecret, type Db } from "@/lib/db/client";
import { TEAM_ROLES } from "@/lib/db/enums";
import { isUniqueViolation as isUnique } from "@/lib/db/errors";
import { newId } from "@/lib/db/ids";
import { auditLog, inviteCodes, inviteRedemptions, joinRequests, teamMembers, teams, users } from "@/lib/db/schema";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { auditEntry } from "@/lib/teams/audit";
import { formatInviteCode, generateInviteCode, hashInviteCode, hashIp, maskedHint, normalizeInviteCode } from "@/lib/teams/invites";
import { can, type TeamAction, type TeamRole } from "@/lib/teams/permissions";
import { findMembershipOf, findTeamByTag, roleIn, type Team } from "@/lib/teams/queries";
import {
  createInviteSchema,
  createTeamSchema,
  emblemKey,
  EXPIRY_OPTIONS,
  joinRequestSchema,
  setRoleSchema,
  tagParamSchema,
  updateIdentitySchema,
  updateProfileSchema,
} from "@/lib/teams/validation";

export interface ActionState {
  error?: string;
  ok?: string;
  /** plaintext invite code, returned exactly once after creation */
  code?: string;
  fields?: Record<string, string>;
}

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Invalid input.";

function revalidateTeam(tag: string) {
  revalidatePath("/teams");
  revalidatePath(`/teams/${tag}`);
  revalidatePath(`/teams/${tag}/manage`);
}

/** Loads the team by tag and the acting member's role in it, then checks permission. */
async function authorize(tagRaw: string, action: TeamAction | null, targetRole?: TeamRole) {
  const member = await requireMember();
  const tag = tagParamSchema.safeParse(tagRaw);
  if (!tag.success) return { error: "Team not found." } as const;
  const db = getDb();
  const team = await findTeamByTag(db, tag.data);
  if (!team) return { error: "Team not found." } as const;
  const role = await roleIn(db, team.id, member.id);
  if (action && !can(role, action, targetRole)) return { error: "You don't have permission to do that." } as const;
  return { member, db, team, role } as const;
}

// ---------------------------------------------------------------- create

export async function createTeam(_prev: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const fields = {
    name: String(form.get("name") ?? ""),
    tag: String(form.get("tag") ?? ""),
    bio: String(form.get("bio") ?? ""),
  };
  const parsed = createTeamSchema.safeParse({
    ...fields,
    focus: form.getAll("focus").map(String),
    joinMode: form.get("joinMode"),
    emblem: form.get("emblem"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error), fields };
  const input = parsed.data;

  const db = getDb();
  if (await findMembershipOf(db, member.id)) return { error: "You're already in a team. Leave it before creating a new one.", fields };

  const rl = await hit(getEnv(), `team-create:${member.id}`, LIMITS.teamCreate);
  if (!rl.ok) return { error: retryMessage(rl), fields };

  const nameTaken = await db.query.teams.findFirst({ columns: { id: true }, where: sql`lower(${teams.name}) = lower(${input.name})` });
  if (nameTaken) return { error: "That team name is taken.", fields };

  const teamId = newId();
  try {
    await db.batch([
      db.insert(teams).values({
        id: teamId,
        name: input.name,
        tag: input.tag,
        bio: input.bio || null,
        focusCategories: input.focus,
        joinMode: input.joinMode,
        logoKey: emblemKey(input.emblem),
        createdBy: member.id,
      }),
      db.insert(teamMembers).values({ teamId, userId: member.id, role: "captain" }),
      db.delete(joinRequests).where(and(eq(joinRequests.userId, member.id), eq(joinRequests.status, "pending"))),
      db.insert(auditLog).values(auditEntry({ teamId, actorId: member.id, action: "team.create", meta: { tag: input.tag } })),
    ]);
  } catch (e) {
    if (isUnique(e, "teams.tag")) return { error: "That tag is taken.", fields };
    if (isUnique(e, "teams.name")) return { error: "That team name is taken.", fields };
    if (isUnique(e, "team_members.user_id")) return { error: "You're already in a team.", fields };
    throw e;
  }
  revalidatePath("/teams");
  redirect(`/teams/${input.tag}`);
}

// ---------------------------------------------------------------- edit

export async function updateIdentity(tag: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorize(tag, "team.edit_identity");
  if ("error" in ctx) return { error: ctx.error };
  const parsed = updateIdentitySchema.safeParse({
    name: form.get("name"),
    tag: form.get("tag"),
    joinMode: form.get("joinMode"),
    emblem: form.get("emblem"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const { db, team, member } = ctx;

  const clash = await db.query.teams.findFirst({
    columns: { id: true },
    where: and(sql`lower(${teams.name}) = lower(${v.name})`, ne(teams.id, team.id)),
  });
  if (clash) return { error: "That team name is taken." };

  try {
    await db.batch([
      db.update(teams).set({ name: v.name, tag: v.tag, joinMode: v.joinMode, logoKey: emblemKey(v.emblem) }).where(eq(teams.id, team.id)),
      db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "team.update_identity", meta: { tag: v.tag } })),
    ]);
  } catch (e) {
    if (isUnique(e, "teams.tag")) return { error: "That tag is taken." };
    if (isUnique(e, "teams.name")) return { error: "That team name is taken." };
    throw e;
  }
  revalidateTeam(team.tag);
  if (v.tag !== team.tag) {
    revalidateTeam(v.tag);
    redirect(`/teams/${v.tag}/manage`);
  }
  return { ok: "Saved." };
}

export async function updateProfile(tag: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorize(tag, "team.edit_profile");
  if ("error" in ctx) return { error: ctx.error };
  const parsed = updateProfileSchema.safeParse({ bio: form.get("bio") ?? "", focus: form.getAll("focus").map(String) });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { db, team, member } = ctx;
  await db.batch([
    db.update(teams).set({ bio: parsed.data.bio || null, focusCategories: parsed.data.focus }).where(eq(teams.id, team.id)),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "team.update_profile" })),
  ]);
  revalidateTeam(team.tag);
  return { ok: "Saved." };
}

// ---------------------------------------------------------------- invites

export async function createInvite(tag: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorize(tag, "invite.manage");
  if ("error" in ctx) return { error: ctx.error };
  const parsed = createInviteSchema.safeParse({
    kind: form.get("kind"),
    expiry: form.get("expiry"),
    maxUses: form.get("maxUses") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { db, team, member } = ctx;
  if (team.joinMode === "closed") return { error: "This team is closed. Change the join mode before creating codes." };

  const code = generateInviteCode();
  const body = normalizeInviteCode(code)!;
  const isPublic = parsed.data.kind === "public";
  const ttl = EXPIRY_OPTIONS[parsed.data.expiry];
  const hint = maskedHint(body);

  await db.batch([
    // One active public code per team: creating a new public code retires the
    // old one. (For private codes the extra `is_public = ?` makes this a no-op.)
    db
      .update(inviteCodes)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(inviteCodes.teamId, team.id),
          eq(inviteCodes.isPublic, true),
          sql`${inviteCodes.revokedAt} is null`,
          sql`${isPublic ? 1 : 0} = 1`,
        ),
      ),
    db.insert(inviteCodes).values({
      id: newId(),
      teamId: team.id,
      codeHash: await hashInviteCode(body, getSecret("INVITE_PEPPER")),
      codePrefix: isPublic ? formatInviteCode(body) : hint,
      isPublic,
      expiresAt: ttl === null ? null : new Date(Date.now() + ttl),
      maxUses: parsed.data.maxUses,
      createdBy: member.id,
    }),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "invite.create", meta: { public: isPublic, hint } })),
  ]);
  revalidateTeam(team.tag);
  return { ok: isPublic ? "Public code created." : "Private code created. Copy it now: it won't be shown again.", code };
}

export async function revokeInvite(tag: string, inviteId: string): Promise<void> {
  const ctx = await authorize(tag, "invite.manage");
  if ("error" in ctx) return;
  const { db, team, member } = ctx;
  const invite = await db.query.inviteCodes.findFirst({
    columns: { id: true, codePrefix: true, isPublic: true },
    // Scoped to this team: an id from another team's page can't be revoked here.
    where: and(eq(inviteCodes.id, inviteId), eq(inviteCodes.teamId, team.id), sql`${inviteCodes.revokedAt} is null`),
  });
  if (!invite) return;
  const hint = invite.isPublic ? maskedHint(normalizeInviteCode(invite.codePrefix) ?? "") : invite.codePrefix;
  await db.batch([
    db.update(inviteCodes).set({ revokedAt: new Date() }).where(eq(inviteCodes.id, invite.id)),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "invite.revoke", targetId: invite.id, meta: { hint } })),
  ]);
  revalidateTeam(team.tag);
}

// ---------------------------------------------------------------- join requests

export async function requestToJoin(tag: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorize(tag, null);
  if ("error" in ctx) return { error: ctx.error };
  const { db, team, member } = ctx;
  if (team.joinMode !== "open") return { error: "This team isn't taking join requests." };
  if (await findMembershipOf(db, member.id)) return { error: "You're already in a team." };
  const parsed = joinRequestSchema.safeParse({ message: form.get("message") ?? "" });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rl = await hit(getEnv(), `join-request:${member.id}`, LIMITS.joinRequest);
  if (!rl.ok) return { error: retryMessage(rl) };

  try {
    await db.batch([
      db.insert(joinRequests).values({ id: newId(), teamId: team.id, userId: member.id, message: parsed.data.message || null }),
      db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "request.create" })),
    ]);
  } catch (e) {
    if (isUnique(e, "join_requests")) return { ok: "Your request is already pending." };
    throw e;
  }
  revalidateTeam(team.tag);
  return { ok: "Request sent. A captain will review it." };
}

export async function cancelRequest(tag: string): Promise<void> {
  const ctx = await authorize(tag, null);
  if ("error" in ctx) return;
  const { db, team, member } = ctx;
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.teamId, team.id), eq(joinRequests.userId, member.id), eq(joinRequests.status, "pending")));
  revalidateTeam(team.tag);
}

export async function decideRequest(tag: string, requestId: string, decision: "approve" | "reject"): Promise<ActionState> {
  // Action arguments come straight from the client: anything else must not fall through to "approve".
  if (decision !== "approve" && decision !== "reject") return { error: "Invalid decision." };
  const ctx = await authorize(tag, "request.decide");
  if ("error" in ctx) return { error: ctx.error };
  const { db, team, member } = ctx;
  const req = await db.query.joinRequests.findFirst({
    where: and(eq(joinRequests.id, requestId), eq(joinRequests.teamId, team.id), eq(joinRequests.status, "pending")),
  });
  if (!req) return { error: "That request is no longer pending." };
  const target = await db.query.users.findFirst({ columns: { handle: true }, where: eq(users.id, req.userId) });
  const meta = { target: target?.handle };
  const decided = { status: decision === "approve" ? "approved" : "rejected", decidedBy: member.id, decidedAt: new Date() } as const;

  if (decision === "reject") {
    await db.batch([
      db.update(joinRequests).set(decided).where(eq(joinRequests.id, req.id)),
      db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "request.reject", targetId: req.userId, meta })),
    ]);
    revalidateTeam(team.tag);
    return { ok: "Rejected." };
  }

  if (team.joinMode === "closed") return { error: "The team is closed. Change the join mode to accept members." };
  // Claim the request first: a concurrent approval loses here instead of tripping
  // the one-team index below and being reported as "joined another team".
  const claimed = await db
    .update(joinRequests)
    .set(decided)
    .where(and(eq(joinRequests.id, req.id), eq(joinRequests.status, "pending")))
    .returning({ id: joinRequests.id });
  if (claimed.length === 0) return { error: "That request is no longer pending." };
  try {
    await db.batch([
      db.insert(teamMembers).values({ teamId: team.id, userId: req.userId, role: "member" }),
      // They're in a team now; their requests elsewhere are moot.
      db.delete(joinRequests).where(and(eq(joinRequests.userId, req.userId), eq(joinRequests.status, "pending"))),
      db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "request.approve", targetId: req.userId, meta })),
    ]);
  } catch (e) {
    if (isUnique(e, "team_members.user_id")) {
      // Joined another team since asking: close the request instead.
      await db.update(joinRequests).set({ ...decided, status: "rejected" }).where(eq(joinRequests.id, req.id));
      revalidateTeam(team.tag);
      return { error: `@${target?.handle ?? "they"} already joined another team.` };
    }
    // Unexpected failure: reopen the request so it can be decided again.
    await db.update(joinRequests).set({ status: "pending", decidedBy: null, decidedAt: null }).where(eq(joinRequests.id, req.id));
    throw e;
  }
  revalidateTeam(team.tag);
  return { ok: "Approved." };
}

// ---------------------------------------------------------------- members

async function loadTarget(db: Db, team: Team, userId: string) {
  const row = await db
    .select({ role: teamMembers.role, handle: users.handle })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId)))
    .limit(1);
  return row[0];
}

export async function setRole(tag: string, userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const base = await authorize(tag, null);
  if ("error" in base) return { error: base.error };
  const target = await loadTarget(base.db, base.team, userId);
  if (!target) return { error: "That person isn't on the team." };
  if (!can(base.role, "member.set_role", target.role)) return { error: "You don't have permission to do that." };
  const parsed = setRoleSchema.safeParse({ role: form.get("role") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { db, team, member } = base;
  await db.batch([
    db.update(teamMembers).set({ role: parsed.data.role }).where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId))),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "member.set_role", targetId: userId, meta: { target: target.handle, role: parsed.data.role } })),
  ]);
  revalidateTeam(team.tag);
  return { ok: "Role updated." };
}

export async function kickMember(tag: string, userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const base = await authorize(tag, null);
  if ("error" in base) return { error: base.error };
  const target = await loadTarget(base.db, base.team, userId);
  if (!target) return { error: "That person isn't on the team." };
  if (!can(base.role, "member.kick", target.role)) return { error: "You don't have permission to do that." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== target.handle) return { error: `Type ${target.handle} to confirm.` };
  const { db, team, member } = base;
  // Re-check the role in the delete itself: a promotion landing between the check
  // above and here must not let a co-captain remove a fellow co-captain.
  const kickable = TEAM_ROLES.filter((r) => can(base.role, "member.kick", r));
  await db.batch([
    db.delete(teamMembers).where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId), inArray(teamMembers.role, kickable))),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "member.kick", targetId: userId, meta: { target: target.handle } })),
  ]);
  revalidateTeam(team.tag);
  return { ok: `Removed @${target.handle}.` };
}

export async function transferCaptaincy(tag: string, userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const base = await authorize(tag, null);
  if ("error" in base) return { error: base.error };
  const target = await loadTarget(base.db, base.team, userId);
  if (!target) return { error: "That person isn't on the team." };
  if (!can(base.role, "captain.transfer", target.role)) return { error: "You don't have permission to do that." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== target.handle) return { error: `Type ${target.handle} to confirm.` };
  const { db, team, member } = base;
  // Demote first, then promote: the one-captain index holds at every step. The batch
  // is one transaction and the demote only runs while the target is still on the
  // team, so a target leaving mid-request can't leave the team without a captain.
  const targetStillHere = sql`exists (select 1 from ${teamMembers} where ${teamMembers.teamId} = ${team.id} and ${teamMembers.userId} = ${userId})`;
  const [demoted] = await db.batch([
    db
      .update(teamMembers)
      .set({ role: "co_captain" })
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, member.id), eq(teamMembers.role, "captain"), targetStillHere))
      .returning({ userId: teamMembers.userId }),
    db.update(teamMembers).set({ role: "captain" }).where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId), sql`not exists (select 1 from ${teamMembers} where ${teamMembers.teamId} = ${team.id} and ${teamMembers.role} = 'captain')`)),
  ]);
  if (demoted.length === 0) return { error: "That person isn't on the team any more." };
  await db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "captain.transfer", targetId: userId, meta: { target: target.handle } }));
  revalidateTeam(team.tag);
  redirect(`/teams/${team.tag}`);
}

export async function leaveTeam(tag: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const base = await authorize(tag, null);
  if ("error" in base) return { error: base.error };
  const { db, team, member, role } = base;
  if (!role) return { error: "You're not on this team." };
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== team.tag) return { error: `Type ${team.tag} to confirm.` };

  const others = await db
    .select({ n: sql<number>`count(*)` })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), ne(teamMembers.userId, member.id)));
  const othersCount = Number(others[0]?.n ?? 0);

  if (role === "captain" && othersCount > 0) return { error: "Hand captaincy to someone first (Manage → Members)." };

  if (othersCount === 0) {
    // Last member out: the team is disbanded (memberships, codes, requests and
    // its audit log go with it via ON DELETE CASCADE).
    await db.delete(teams).where(eq(teams.id, team.id));
    revalidatePath("/teams");
    redirect("/teams");
  }

  // `role <> captain` in the delete: a captaincy handed over mid-request can't walk out.
  const left = await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, member.id), ne(teamMembers.role, "captain")))
    .returning({ userId: teamMembers.userId });
  if (left.length === 0) return { error: "Hand captaincy to someone first (Manage → Members)." };
  await db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "member.leave" }));
  revalidateTeam(team.tag);
  redirect(`/teams/${team.tag}`);
}

// ---------------------------------------------------------------- redeem

/** Shared by /join and (Phase 6) the terminal palette's `join <code>`. */
export async function redeemInvite(_prev: ActionState, form: FormData): Promise<ActionState> {
  const member: OnboardedMember = await requireMember();
  const raw = String(form.get("code") ?? "");
  const env = getEnv();
  const pepper = getSecret("INVITE_PEPPER");
  const db = getDb();
  const ip = await clientIp();
  const ipHash = ip ? await hashIp(ip, pepper) : null;
  const fail = { error: "That code is invalid, expired or used up.", fields: { code: raw } };

  // Membership is checked before the code, so this message says nothing about the code.
  if (await findMembershipOf(db, member.id)) return { error: "You're already in a team. Leave it before joining another.", fields: { code: raw } };

  const [byUser, byIp] = await Promise.all([
    hit(env, `redeem:user:${member.id}`, LIMITS.inviteRedeemUser),
    ipHash ? hit(env, `redeem:ip:${ipHash}`, LIMITS.inviteRedeemIp) : Promise.resolve({ ok: true, remaining: 1, retryAfter: 0 }),
  ]);
  const log = (inviteId: string | null, success: boolean) =>
    db.insert(inviteRedemptions).values({ id: newId(), inviteId, userId: member.id, ipHash, success });

  if (!byUser.ok || !byIp.ok) {
    await log(null, false);
    return { error: retryMessage(byUser.ok ? byIp : byUser), fields: { code: raw } };
  }

  const body = normalizeInviteCode(raw);
  if (!body) {
    await log(null, false);
    return fail;
  }
  const invite = await db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.codeHash, await hashInviteCode(body, pepper)),
  });
  const team = invite ? await db.query.teams.findFirst({ where: eq(teams.id, invite.teamId) }) : undefined;
  if (!invite || !team || team.joinMode === "closed") {
    await log(invite?.id ?? null, false);
    return fail;
  }

  // Atomically claim one use; all validity rules live in this WHERE clause.
  const claimed = await db
    .update(inviteCodes)
    .set({ uses: sql`${inviteCodes.uses} + 1` })
    .where(
      and(
        eq(inviteCodes.id, invite.id),
        sql`${inviteCodes.revokedAt} is null`,
        sql`(${inviteCodes.expiresAt} is null or ${inviteCodes.expiresAt} > ${Date.now()})`,
        sql`(${inviteCodes.maxUses} is null or ${inviteCodes.uses} < ${inviteCodes.maxUses})`,
      ),
    )
    .returning({ id: inviteCodes.id });
  if (claimed.length === 0) {
    await log(invite.id, false);
    return fail;
  }

  const hint = maskedHint(body);
  try {
    await db.batch([
      db.insert(teamMembers).values({ teamId: team.id, userId: member.id, role: "member" }),
      db.delete(joinRequests).where(and(eq(joinRequests.userId, member.id), eq(joinRequests.status, "pending"))),
      log(invite.id, true),
      db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "invite.redeem", targetId: invite.id, meta: { hint } })),
    ]);
  } catch (e) {
    // Lost a race (joined elsewhere meanwhile): give the use back.
    await db.update(inviteCodes).set({ uses: sql`max(${inviteCodes.uses} - 1, 0)` }).where(eq(inviteCodes.id, invite.id));
    await log(invite.id, false);
    if (isUnique(e, "team_members.user_id")) return { error: "You're already in a team.", fields: { code: raw } };
    throw e;
  }
  revalidateTeam(team.tag);
  redirect(`/teams/${team.tag}`);
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  // Set by Cloudflare's edge and can't be spoofed by the client. No X-Forwarded-For
  // fallback: that header is client-controlled and would let the IP limit be rotated.
  return h.get("cf-connecting-ip");
}
