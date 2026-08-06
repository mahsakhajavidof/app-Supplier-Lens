CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	`valid_until` integer,
	`note` text,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`attention` text NOT NULL,
	`follow_up` text DEFAULT 'UNRESOLVED' NOT NULL,
	`reviewed` integer DEFAULT false NOT NULL,
	`source` text NOT NULL,
	`previous_value` text,
	`current_value` text,
	`ai_explanation` text,
	`owner_id` text,
	`detected_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `financial_years` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`year` integer NOT NULL,
	`operating_revenue` real,
	`operating_result` real,
	`result_before_tax` real,
	`equity_ratio` real,
	`liquidity_ratio` real,
	`employees` integer,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`author_id` text,
	`text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ownerships` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`name` text NOT NULL,
	`share_percent` real NOT NULL,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`since` text,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `registry_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`subcontractor_id` text NOT NULL,
	`country` text NOT NULL,
	`raw` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`desc` text NOT NULL,
	`frequency` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subcontractors` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`org_nr` text NOT NULL,
	`country` text DEFAULT 'NO' NOT NULL,
	`category` text NOT NULL,
	`legal_form` text,
	`company_status` text DEFAULT 'Registered and active' NOT NULL,
	`registered_on` text,
	`industry_code` text,
	`employees` integer,
	`municipality` text,
	`vat_registered` integer DEFAULT false NOT NULL,
	`auditor` text,
	`share_capital` text,
	`address` text,
	`postal_address` text,
	`contact_email` text,
	`contact_phone` text,
	`ai_summary` text,
	`owner_id` text,
	`last_checked_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subcontractor_id` text NOT NULL,
	`event_id` text,
	`owner_id` text,
	`due` integer,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`initials` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_email_unique` ON `team_members` (`email`);