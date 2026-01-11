CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`key` varchar(255) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`lastUsed` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiKeys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `webhookLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`serverId` int,
	`payload` text NOT NULL,
	`response` text,
	`status` enum('success','failed','pending') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `apiKeys` (`userId`);--> statement-breakpoint
CREATE INDEX `keyIdx` ON `apiKeys` (`key`);--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `webhookLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `actionIdx` ON `webhookLogs` (`action`);--> statement-breakpoint
CREATE INDEX `timestampIdx` ON `webhookLogs` (`timestamp`);