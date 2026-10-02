CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text,
	`actor_id` text,
	`action` text NOT NULL,
	`target_id` text,
	`meta_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_team_idx` ON `audit_log` (`team_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `badges` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tier` text,
	`icon_key` text,
	`secret` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `badges_slug_unique` ON `badges` (`slug`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`writeup_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`writeup_id`, `user_id`),
	FOREIGN KEY (`writeup_id`) REFERENCES `writeups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bookmarks_user_idx` ON `bookmarks` (`user_id`);--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`points` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`claimed_by` text,
	`solved_at` integer,
	`notes_md` text,
	`links_json` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claimed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "challenges_status_ck" CHECK("challenges"."status" in ('open', 'claimed', 'solving', 'solved'))
);
--> statement-breakpoint
CREATE INDEX `challenges_board_idx` ON `challenges` (`event_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`writeup_id` text NOT NULL,
	`author_id` text NOT NULL,
	`parent_id` text,
	`body_md` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`writeup_id`) REFERENCES `writeups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_writeup_idx` ON `comments` (`writeup_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `event_registrations` (
	`event_id` text NOT NULL,
	`team_id` text NOT NULL,
	`roster_json` text DEFAULT '[]' NOT NULL,
	`registered_by` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`event_id`, `team_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`format` text,
	`url` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`weight` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT "events_window_ck" CHECK("events"."ends_at" > "events"."starts_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_starts_idx` ON `events` (`starts_at`);--> statement-breakpoint
CREATE TABLE `invite_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`code_prefix` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`expires_at` integer,
	`max_uses` integer,
	`uses` integer DEFAULT 0 NOT NULL,
	`revoked_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invite_codes_uses_ck" CHECK("invite_codes"."uses" >= 0 and ("invite_codes"."max_uses" is null or "invite_codes"."max_uses" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_codes_code_hash_unique` ON `invite_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `invite_codes_team_idx` ON `invite_codes` (`team_id`);--> statement-breakpoint
CREATE TABLE `invite_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`invite_id` text,
	`user_id` text NOT NULL,
	`ip_hash` text,
	`success` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invite_id`) REFERENCES `invite_codes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invite_redemptions_user_idx` ON `invite_redemptions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by` text,
	`decided_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "join_requests_status_ck" CHECK("join_requests"."status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `join_requests_one_pending_uq` ON `join_requests` (`team_id`,`user_id`) WHERE "join_requests"."status" = 'pending';--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	CONSTRAINT "seasons_window_ck" CHECK("seasons"."ends_at" > "seasons"."starts_at")
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "team_members_role_ck" CHECK("team_members"."role" in ('captain', 'co_captain', 'member', 'reserve'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_one_captain_uq` ON `team_members` (`team_id`) WHERE "team_members"."role" = 'captain';--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tag` text NOT NULL,
	`logo_key` text,
	`bio` text,
	`focus_categories_json` text DEFAULT '[]' NOT NULL,
	`join_mode` text DEFAULT 'invite' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "teams_tag_len_ck" CHECK(length("teams"."tag") between 2 and 5),
	CONSTRAINT "teams_join_mode_ck" CHECK("teams"."join_mode" in ('open', 'invite', 'closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_tag_unique` ON `teams` (`tag`);--> statement-breakpoint
CREATE TABLE `user_badges` (
	`user_id` text NOT NULL,
	`badge_id` text NOT NULL,
	`awarded_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `badge_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`badge_id`) REFERENCES `badges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_id` text NOT NULL,
	`handle` text,
	`display_name` text,
	`avatar_url` text,
	`bio` text,
	`xp` integer DEFAULT 0 NOT NULL,
	`rank_tier` text DEFAULT 'initiate' NOT NULL,
	`skills_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "users_rank_tier_ck" CHECK("users"."rank_tier" in ('initiate', 'operator', 'specialist', 'elite', 'legend')),
	CONSTRAINT "users_xp_ck" CHECK("users"."xp" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_id_unique` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_unique` ON `users` (`handle`);--> statement-breakpoint
CREATE TABLE `votes` (
	`writeup_id` text NOT NULL,
	`user_id` text NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`writeup_id`, `user_id`),
	FOREIGN KEY (`writeup_id`) REFERENCES `writeups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "votes_value_ck" CHECK("votes"."value" in (-1, 1))
);
--> statement-breakpoint
CREATE TABLE `writeup_series` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `writeup_series_author_slug_uq` ON `writeup_series` (`author_id`,`slug`);--> statement-breakpoint
CREATE TABLE `writeup_tags` (
	`writeup_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`writeup_id`, `tag`),
	FOREIGN KEY (`writeup_id`) REFERENCES `writeups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `writeup_tags_tag_idx` ON `writeup_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `writeups` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`team_id` text,
	`event_id` text,
	`series_id` text,
	`series_order` integer,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`body_md` text NOT NULL,
	`category` text,
	`difficulty` text,
	`spoiler_until` integer,
	`published_at` integer,
	`score` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`series_id`) REFERENCES `writeup_series`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "writeups_difficulty_ck" CHECK("writeups"."difficulty" is null or "writeups"."difficulty" in ('beginner', 'easy', 'medium', 'hard', 'insane'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `writeups_author_slug_uq` ON `writeups` (`author_id`,`slug`);--> statement-breakpoint
CREATE INDEX `writeups_published_idx` ON `writeups` (`published_at`);--> statement-breakpoint
CREATE INDEX `writeups_event_idx` ON `writeups` (`event_id`);--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`season_id` text,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`ref_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `xp_events_season_user_idx` ON `xp_events` (`season_id`,`user_id`);