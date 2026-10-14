CREATE TABLE `writeup_hearts` (
	`writeup_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`writeup_id`, `user_id`),
	FOREIGN KEY (`writeup_id`) REFERENCES `writeups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_organizer` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `writeups` ADD `heart_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- One-time fix: comment_count used to include soft-deleted comments.
UPDATE `writeups` SET `comment_count` = (SELECT count(*) FROM `comments` c WHERE c.`writeup_id` = `writeups`.`id` AND c.`deleted_at` IS NULL);
