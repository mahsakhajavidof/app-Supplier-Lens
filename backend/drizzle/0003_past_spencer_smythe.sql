CREATE TABLE `companydata_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`call_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registry_check_log` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`provider` text NOT NULL,
	`data_type` text,
	`success` integer NOT NULL,
	`status_code` integer,
	`error_message` text,
	`checked_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `registry_snapshots` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `registry_snapshots` ADD `data_type` text;--> statement-breakpoint
ALTER TABLE `registry_snapshots` ADD `hash` text;--> statement-breakpoint
ALTER TABLE `subcontractors` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `subcontractors` ADD `last_check_attempted_at` integer;--> statement-breakpoint
ALTER TABLE `subcontractors` ADD `next_check_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `companydata_usage_month_unique` ON `companydata_usage` (`month`);