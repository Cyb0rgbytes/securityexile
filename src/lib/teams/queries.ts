import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { auditLog, inviteCodes, joinRequests, teamMembers, teams, users } from "@/lib/db/schema";
import type { TeamRole } from "./permissions";

export type Team = typeof teams.$inferSelect;

export async function findTeamByTag(db: Db, tag: string): Promise<Team | undefined> {
  return db.query.teams.findFirst({ where: eq(teams.tag, tag.toUpperCase()) });
}

/** The member's single team (one-team rule), with their role. */
export async function findMembershipOf(db: Db, userId: string) {
  const [row] = await db
    .select({ team: teams, role: teamMembers.role })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId))
    .limit(1);
  return row as { team: Team; role: TeamRole } | undefined;
}

export async function roleIn(db: Db, teamId: string, userId: string): Promise<TeamRole | null> {
  const row = await db.query.teamMembers.findFirst({
    columns: { role: true },
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
  });
  return row?.role ?? null;
}

const ROLE_ORDER = sql`case ${teamMembers.role} when 'captain' then 0 when 'co_captain' then 1 when 'member' then 2 else 3 end`;

export async function listRoster(db: Db, teamId: string) {
  return db
    .select({
      userId: users.id,
      handle: users.handle,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(ROLE_ORDER, asc(teamMembers.joinedAt));
}

export async function listTeams(db: Db) {
  return db
    .select({
      tag: teams.tag,
      name: teams.name,
      logoKey: teams.logoKey,
      joinMode: teams.joinMode,
      focus: teams.focusCategories,
      members: count(teamMembers.userId),
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .groupBy(teams.id)
    .orderBy(desc(count(teamMembers.userId)), asc(teams.name));
}

export async function listPendingRequests(db: Db, teamId: string) {
  return db
    .select({
      id: joinRequests.id,
      message: joinRequests.message,
      createdAt: joinRequests.createdAt,
      handle: users.handle,
      avatarUrl: users.avatarUrl,
    })
    .from(joinRequests)
    .innerJoin(users, eq(users.id, joinRequests.userId))
    .where(and(eq(joinRequests.teamId, teamId), eq(joinRequests.status, "pending")))
    .orderBy(asc(joinRequests.createdAt));
}

export async function pendingRequestOf(db: Db, teamId: string, userId: string) {
  return db.query.joinRequests.findFirst({
    columns: { id: true },
    where: and(eq(joinRequests.teamId, teamId), eq(joinRequests.userId, userId), eq(joinRequests.status, "pending")),
  });
}

export type InviteStatus = "active" | "revoked" | "expired" | "used up";

export async function listInvites(db: Db, teamId: string) {
  const rows = await db
    .select({
      id: inviteCodes.id,
      display: inviteCodes.codePrefix,
      isPublic: inviteCodes.isPublic,
      uses: inviteCodes.uses,
      maxUses: inviteCodes.maxUses,
      expiresAt: inviteCodes.expiresAt,
      revokedAt: inviteCodes.revokedAt,
      createdAt: inviteCodes.createdAt,
      creator: users.handle,
    })
    .from(inviteCodes)
    .leftJoin(users, eq(users.id, inviteCodes.createdBy))
    .where(eq(inviteCodes.teamId, teamId))
    .orderBy(desc(inviteCodes.createdAt))
    .limit(50);
  const now = Date.now();
  return rows.map((i) => {
    const status: InviteStatus = i.revokedAt
      ? "revoked"
      : i.expiresAt !== null && i.expiresAt.getTime() <= now
        ? "expired"
        : i.maxUses !== null && i.uses >= i.maxUses
          ? "used up"
          : "active";
    return { ...i, status };
  });
}

/** The team's current public code (shown to members), if one is active. */
export async function activePublicCode(db: Db, teamId: string): Promise<string | null> {
  const now = new Date();
  const rows = await db
    .select({ display: inviteCodes.codePrefix, expiresAt: inviteCodes.expiresAt, uses: inviteCodes.uses, maxUses: inviteCodes.maxUses })
    .from(inviteCodes)
    .where(and(eq(inviteCodes.teamId, teamId), eq(inviteCodes.isPublic, true), sql`${inviteCodes.revokedAt} is null`))
    .orderBy(desc(inviteCodes.createdAt))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  if (r.expiresAt && r.expiresAt <= now) return null;
  if (r.maxUses !== null && r.uses >= r.maxUses) return null;
  return r.display;
}

export async function listAudit(db: Db, teamId: string) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      meta: auditLog.meta,
      createdAt: auditLog.createdAt,
      actor: users.handle,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(eq(auditLog.teamId, teamId))
    .orderBy(desc(auditLog.createdAt))
    .limit(50);
}
