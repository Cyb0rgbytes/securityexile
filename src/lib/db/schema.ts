/*
 * Security Exile database schema (Cloudflare D1 / SQLite, Drizzle).
 *
 * Conventions
 * - Primary keys are ULID text (see ./ids.ts); join tables use composite keys.
 * - Timestamps are integer epoch-ms (`mode: "timestamp_ms"` -> Date in TS).
 * - Enums are text columns typed via `enum` and enforced in SQL with CHECK.
 * - JSON blobs are text columns (`mode: "json"`), validated with Zod at the edges.
 *
 * Changing this file after Phase 2 requires the project owner's approval.
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// ---------- shared enums ----------

export const RANK_TIERS = ["initiate", "operator", "specialist", "elite", "legend"] as const;
export const JOIN_MODES = ["open", "invite", "closed"] as const;
export const TEAM_ROLES = ["captain", "co_captain", "member", "reserve"] as const;
export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export const CHALLENGE_STATUSES = ["open", "claimed", "solving", "solved"] as const;
export const DIFFICULTIES = ["beginner", "easy", "medium", "hard", "insane"] as const;

/** SQL `col IN ('a','b')` for a CHECK constraint built from a const tuple. */
const oneOf = (column: AnySQLiteColumn, values: readonly string[]) =>
  sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`;

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

// ---------- people ----------

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    clerkId: text("clerk_id").notNull().unique(),
    /** null until the member claims one during onboarding */
    handle: text("handle").unique(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    xp: integer("xp").notNull().default(0),
    rankTier: text("rank_tier", { enum: RANK_TIERS }).notNull().default("initiate"),
    skills: text("skills_json", { mode: "json" }).$type<Record<string, number>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("users_rank_tier_ck", oneOf(t.rankTier, RANK_TIERS)),
    check("users_xp_ck", sql`${t.xp} >= 0`),
  ],
);

// ---------- teams ----------

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    tag: text("tag").notNull().unique(),
    logoKey: text("logo_key"),
    bio: text("bio"),
    focusCategories: text("focus_categories_json", { mode: "json" }).$type<string[]>().notNull().default([]),
    joinMode: text("join_mode", { enum: JOIN_MODES }).notNull().default("invite"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("teams_tag_len_ck", sql`length(${t.tag}) between 2 and 5`),
    check("teams_join_mode_ck", oneOf(t.joinMode, JOIN_MODES)),
  ],
);

export const teamMembers = sqliteTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: TEAM_ROLES }).notNull().default("member"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.userId] }),
    check("team_members_role_ck", oneOf(t.role, TEAM_ROLES)),
    // Exactly one captain per team, enforced by the database.
    uniqueIndex("team_members_one_captain_uq").on(t.teamId).where(sql`${t.role} = 'captain'`),
    index("team_members_user_idx").on(t.userId),
  ],
);

export const joinRequests = sqliteTable(
  "join_requests",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message"),
    status: text("status", { enum: REQUEST_STATUSES }).notNull().default("pending"),
    decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    check("join_requests_status_ck", oneOf(t.status, REQUEST_STATUSES)),
    // One open request per user per team; history of decided ones is kept.
    uniqueIndex("join_requests_one_pending_uq")
      .on(t.teamId, t.userId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const inviteCodes = sqliteTable(
  "invite_codes",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    /** SHA-256(normalized code + INVITE_PEPPER), hex. The code itself is never stored. */
    codeHash: text("code_hash").notNull().unique(),
    /** Non-secret display prefix, e.g. "TEAM-7F3K". */
    codePrefix: text("code_prefix").notNull(),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("invite_codes_uses_ck", sql`${t.uses} >= 0 and (${t.maxUses} is null or ${t.maxUses} > 0)`),
    index("invite_codes_team_idx").on(t.teamId),
  ],
);

export const inviteRedemptions = sqliteTable(
  "invite_redemptions",
  {
    id: text("id").primaryKey(),
    /** null when the attempt didn't match any code */
    inviteId: text("invite_id").references(() => inviteCodes.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash"),
    success: integer("success", { mode: "boolean" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("invite_redemptions_user_idx").on(t.userId, t.createdAt)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetId: text("target_id"),
    meta: text("meta_json", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_team_idx").on(t.teamId, t.createdAt)],
);

// ---------- events & war room ----------

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    format: text("format"),
    url: text("url"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    weight: integer("weight"),
    createdAt: createdAt(),
  },
  (t) => [
    check("events_window_ck", sql`${t.endsAt} > ${t.startsAt}`),
    index("events_starts_idx").on(t.startsAt),
  ],
);

export const eventRegistrations = sqliteTable(
  "event_registrations",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    /** user ids on the roster for this event */
    roster: text("roster_json", { mode: "json" }).$type<string[]>().notNull().default([]),
    registeredBy: text("registered_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.teamId] })],
);

export const challenges = sqliteTable(
  "challenges",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    points: integer("points"),
    status: text("status", { enum: CHALLENGE_STATUSES }).notNull().default("open"),
    claimedBy: text("claimed_by").references(() => users.id, { onDelete: "set null" }),
    solvedAt: integer("solved_at", { mode: "timestamp_ms" }),
    notesMd: text("notes_md"),
    links: text("links_json", { mode: "json" }).$type<{ label: string; url: string }[]>().notNull().default([]),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("challenges_status_ck", oneOf(t.status, CHALLENGE_STATUSES)),
    index("challenges_board_idx").on(t.eventId, t.teamId),
  ],
);

// ---------- writeups ----------

export const writeupSeries = sqliteTable(
  "writeup_series",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
  },
  (t) => [uniqueIndex("writeup_series_author_slug_uq").on(t.authorId, t.slug)],
);

export const writeups = sqliteTable(
  "writeups",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    seriesId: text("series_id").references(() => writeupSeries.id, { onDelete: "set null" }),
    seriesOrder: integer("series_order"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    category: text("category"),
    difficulty: text("difficulty", { enum: DIFFICULTIES }),
    /** Hidden from everyone but the author until this time (live-event spoiler lock). */
    spoilerUntil: integer("spoiler_until", { mode: "timestamp_ms" }),
    /** null = draft */
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    score: integer("score").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("writeups_difficulty_ck", sql`${t.difficulty} is null or ${oneOf(t.difficulty, DIFFICULTIES)}`),
    uniqueIndex("writeups_author_slug_uq").on(t.authorId, t.slug),
    index("writeups_published_idx").on(t.publishedAt),
    index("writeups_event_idx").on(t.eventId),
  ],
);

export const writeupTags = sqliteTable(
  "writeup_tags",
  {
    writeupId: text("writeup_id")
      .notNull()
      .references(() => writeups.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.writeupId, t.tag] }), index("writeup_tags_tag_idx").on(t.tag)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    writeupId: text("writeup_id")
      .notNull()
      .references(() => writeups.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => comments.id, { onDelete: "cascade" }),
    bodyMd: text("body_md").notNull(),
    createdAt: createdAt(),
    /** soft delete keeps thread structure intact */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("comments_writeup_idx").on(t.writeupId, t.createdAt)],
);

export const votes = sqliteTable(
  "votes",
  {
    writeupId: text("writeup_id")
      .notNull()
      .references(() => writeups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.writeupId, t.userId] }),
    check("votes_value_ck", sql`${t.value} in (-1, 1)`),
  ],
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    writeupId: text("writeup_id")
      .notNull()
      .references(() => writeups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.writeupId, t.userId] }), index("bookmarks_user_idx").on(t.userId)],
);

// ---------- gamification ----------

export const badges = sqliteTable("badges", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  tier: text("tier"),
  iconKey: text("icon_key"),
  /** easter-egg badges stay hidden until earned */
  secret: integer("secret", { mode: "boolean" }).notNull().default(false),
});

export const userBadges = sqliteTable(
  "user_badges",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: integer("awarded_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

export const seasons = sqliteTable(
  "seasons",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [check("seasons_window_ck", sql`${t.endsAt} > ${t.startsAt}`)],
);

export const xpEvents = sqliteTable(
  "xp_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seasonId: text("season_id").references(() => seasons.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    refId: text("ref_id"),
    createdAt: createdAt(),
  },
  (t) => [index("xp_events_season_user_idx").on(t.seasonId, t.userId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
