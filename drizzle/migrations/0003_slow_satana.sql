CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`writeup_id` text,
	`r2_key` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`writeup_id`) REFERENCES `writeups`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "uploads_mime_ck" CHECK("uploads"."mime" in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
	CONSTRAINT "uploads_bytes_ck" CHECK("uploads"."bytes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uploads_r2_key_unique` ON `uploads` (`r2_key`);--> statement-breakpoint
CREATE INDEX `uploads_owner_idx` ON `uploads` (`owner_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `comments` ADD `body_html` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `edited_at` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `hidden_at` integer;--> statement-breakpoint
ALTER TABLE `writeups` ADD `body_html` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `writeups` ADD `hidden_at` integer;--> statement-breakpoint
ALTER TABLE `writeups` ADD `vote_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `writeups` ADD `comment_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `writeups_rank_idx` ON `writeups` (`published_at`,`vote_count`);