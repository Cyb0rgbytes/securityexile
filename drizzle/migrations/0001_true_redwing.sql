DROP INDEX `team_members_user_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_one_team_per_user_uq` ON `team_members` (`user_id`);