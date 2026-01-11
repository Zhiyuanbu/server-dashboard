CREATE TABLE `alertConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`metricType` enum('cpu','ram','disk','network') NOT NULL,
	`threshold` float NOT NULL,
	`operator` enum('greater','less','equal') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`notifyEmail` boolean NOT NULL DEFAULT true,
	`emailRecipients` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`alertConfigId` int NOT NULL,
	`metricType` enum('cpu','ram','disk','network') NOT NULL,
	`currentValue` float NOT NULL,
	`threshold` float NOT NULL,
	`severity` enum('warning','critical') NOT NULL,
	`message` text NOT NULL,
	`acknowledged` boolean NOT NULL DEFAULT false,
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`emailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logAnalysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`analysisType` enum('pattern','prediction','troubleshooting','summary') NOT NULL,
	`logIds` text,
	`findings` text NOT NULL,
	`recommendations` text,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logAnalysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`pid` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`user` varchar(100),
	`cpuUsage` float NOT NULL DEFAULT 0,
	`ramUsage` bigint NOT NULL DEFAULT 0,
	`status` enum('running','sleeping','stopped','zombie') NOT NULL DEFAULT 'running',
	`command` text,
	`startTime` timestamp,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serverMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`cpuUsage` float NOT NULL,
	`ramUsage` bigint NOT NULL,
	`ramUsagePercent` float NOT NULL,
	`diskUsage` bigint NOT NULL,
	`diskUsagePercent` float NOT NULL,
	`networkIn` bigint NOT NULL DEFAULT 0,
	`networkOut` bigint NOT NULL DEFAULT 0,
	`activeConnections` int NOT NULL DEFAULT 0,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serverMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serverPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serverId` int NOT NULL,
	`canView` boolean NOT NULL DEFAULT true,
	`canManage` boolean NOT NULL DEFAULT false,
	`canDelete` boolean NOT NULL DEFAULT false,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`grantedBy` int NOT NULL,
	CONSTRAINT `serverPermissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`hostname` varchar(255) NOT NULL,
	`ipAddress` varchar(45) NOT NULL,
	`port` int NOT NULL DEFAULT 22,
	`status` enum('online','offline','warning','error') NOT NULL DEFAULT 'offline',
	`os` varchar(100),
	`osVersion` varchar(100),
	`kernelVersion` varchar(100),
	`cpuModel` text,
	`cpuCores` int,
	`totalRam` bigint,
	`totalDisk` bigint,
	`uptime` bigint,
	`lastSeen` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `servers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`level` enum('info','warning','error','critical') NOT NULL,
	`source` varchar(255),
	`message` text NOT NULL,
	`details` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `systemLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `serverIdIdx` ON `alertConfigs` (`serverId`);--> statement-breakpoint
CREATE INDEX `serverIdIdx` ON `alerts` (`serverId`);--> statement-breakpoint
CREATE INDEX `acknowledgedIdx` ON `alerts` (`acknowledged`);--> statement-breakpoint
CREATE INDEX `serverIdIdx` ON `logAnalysis` (`serverId`);--> statement-breakpoint
CREATE INDEX `createdAtIdx` ON `logAnalysis` (`createdAt`);--> statement-breakpoint
CREATE INDEX `serverIdIdx` ON `processes` (`serverId`);--> statement-breakpoint
CREATE INDEX `pidIdx` ON `processes` (`serverId`,`pid`);--> statement-breakpoint
CREATE INDEX `serverIdIdx` ON `serverMetrics` (`serverId`);--> statement-breakpoint
CREATE INDEX `timestampIdx` ON `serverMetrics` (`timestamp`);--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `serverPermissions` (`userId`);--> statement-breakpoint
CREATE INDEX `serverIdIdx` ON `serverPermissions` (`serverId`);--> statement-breakpoint
CREATE INDEX `createdByIdx` ON `servers` (`createdBy`);--> statement-breakpoint
CREATE INDEX `serverIdIdx` ON `systemLogs` (`serverId`);--> statement-breakpoint
CREATE INDEX `levelIdx` ON `systemLogs` (`level`);--> statement-breakpoint
CREATE INDEX `timestampIdx` ON `systemLogs` (`timestamp`);