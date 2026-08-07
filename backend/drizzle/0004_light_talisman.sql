CREATE TABLE `risk_indicator_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`indicator_key` text NOT NULL,
	`status` text DEFAULT 'NOT_REVIEWED' NOT NULL,
	`note` text,
	`decided_by_id` text,
	`decided_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `source_indicator_key` text;