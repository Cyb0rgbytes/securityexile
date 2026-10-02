ALTER TABLE `users` ADD `platform_role` text DEFAULT 'member' NOT NULL CHECK (`platform_role` in ('member','moderator','admin'));--> statement-breakpoint
ALTER TABLE `events` ADD `kind` text DEFAULT 'ctf' NOT NULL CHECK (`kind` in ('ctf','community'));--> statement-breakpoint
ALTER TABLE `events` ADD `description` text;--> statement-breakpoint
ALTER TABLE `events` ADD `created_by` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `events` ADD `owner_team_id` text REFERENCES teams(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `events` ADD `hidden_at` integer;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `notes_md` text;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `notes_updated_at` integer;--> statement-breakpoint
ALTER TABLE `challenges` ADD `created_by` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
CREATE UNIQUE INDEX `challenges_name_uq` ON `challenges` (`event_id`,`team_id`,lower("name"));
