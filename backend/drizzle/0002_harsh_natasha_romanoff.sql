-- SQLite does not support "Drop not null from column" out of the box, we do not generate automatic migration for that, so it has to be done manually
-- Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
--                  https://www.sqlite.org/lang_altertable.html
--                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3
--
-- Due to that we don't generate migration automatically and it has to be done manually
ALTER TABLE `team_members` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
-- SQLite has no ALTER COLUMN; dropping the NOT NULL on `email` (real
-- addresses aren't always known up front) requires the standard
-- recreate-table dance. `team_members`'s `id` values are unchanged, so
-- every other table's FOREIGN KEY (owner_id/author_id) REFERENCES
-- `team_members`(`id`) stays valid once the rename completes.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`role` text NOT NULL,
	`initials` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_team_members`(`id`, `name`, `email`, `role`, `initials`, `active`, `created_at`)
SELECT `id`, `name`, `email`, `role`, `initials`, `active`, `created_at` FROM `team_members`;--> statement-breakpoint
DROP TABLE `team_members`;--> statement-breakpoint
ALTER TABLE `__new_team_members` RENAME TO `team_members`;--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_email_unique` ON `team_members` (`email`);--> statement-breakpoint
PRAGMA foreign_keys=ON;