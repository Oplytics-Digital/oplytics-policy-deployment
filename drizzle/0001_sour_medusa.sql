CREATE TABLE `annual_objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text NOT NULL,
	`ownerId` int,
	`ownerName` varchar(255),
	`aoStatus` enum('on-track','at-risk','off-track','not-started','completed') NOT NULL DEFAULT 'not-started',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `annual_objectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bowling_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`planValue` decimal(12,2),
	`actualValue` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bowling_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `breakthrough_objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text NOT NULL,
	`boCategory` enum('safety','cost','delivery','quality','morale') NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `breakthrough_objectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deployment_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deploymentTargetId` int NOT NULL,
	`auditedById` int,
	`auditedByName` varchar(255),
	`auditDate` timestamp NOT NULL,
	`deploymentRating` enum('strong','weak','not-started') NOT NULL DEFAULT 'not-started',
	`progressRating` enum('strong','weak','not-started') NOT NULL DEFAULT 'not-started',
	`notes` text,
	`aiSuggestion` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deployment_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deployment_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deploymentTargetId` int NOT NULL,
	`period` varchar(20) NOT NULL,
	`periodType` enum('daily','weekly','monthly') NOT NULL DEFAULT 'monthly',
	`actualValue` decimal(12,4),
	`auditedValue` decimal(12,4),
	`auditedById` int,
	`auditedByName` varchar(255),
	`auditedAt` timestamp,
	`metricSource` enum('manual','sqdcp','oee','safety','action') NOT NULL DEFAULT 'manual',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deployment_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deployment_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`objectiveId` int NOT NULL,
	`objType` enum('bo','ao') NOT NULL,
	`objectiveCode` varchar(20),
	`siteId` int NOT NULL,
	`siteName` varchar(255),
	`sqdcpCategory` enum('safety','quality','delivery','cost','people') NOT NULL,
	`deploymentTitle` varchar(500) NOT NULL,
	`deploymentDescription` text,
	`targetMetric` varchar(255),
	`targetValue` decimal(12,2),
	`currentValue` decimal(12,2),
	`unit` varchar(50),
	`deployStatus` enum('not-deployed','deployed','active','completed') NOT NULL DEFAULT 'not-deployed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deployment_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `improvement_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(500) NOT NULL,
	`description` text,
	`ownerId` int,
	`ownerName` varchar(255),
	`projStatus` enum('on-track','at-risk','off-track','not-started','completed') NOT NULL DEFAULT 'not-started',
	`progress` int NOT NULL DEFAULT 0,
	`startDate` varchar(20),
	`endDate` varchar(20),
	`projCategory` enum('strategic','operational','improvement') NOT NULL DEFAULT 'improvement',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `improvement_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metric_push_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pushSource` enum('sqdcp','oee','safety','action','manual','api') NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`requestBody` text,
	`deploymentTargetId` int,
	`metricsCreated` int NOT NULL DEFAULT 0,
	`pushStatus` enum('success','partial','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `metric_push_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_correlations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`sourceId` int NOT NULL,
	`targetId` int NOT NULL,
	`sourceType` enum('bo','ao','project','kpi') NOT NULL,
	`targetType` enum('bo','ao','project','kpi') NOT NULL,
	`corrStrength` enum('strong','weak') NOT NULL DEFAULT 'strong',
	`corrQuadrant` enum('bo-ao','ao-proj','proj-kpi','kpi-bo') NOT NULL,
	CONSTRAINT `policy_correlations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_kpis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(500) NOT NULL,
	`unit` varchar(50),
	`target` decimal(12,2),
	`current` decimal(12,2),
	`kpiDirection` enum('up','down') NOT NULL DEFAULT 'up',
	`ownerId` int,
	`ownerName` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policy_kpis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enterpriseId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`year` int NOT NULL,
	`level` enum('enterprise','business_unit','site') NOT NULL DEFAULT 'enterprise',
	`ownerId` int,
	`ownerName` varchar(255),
	`planStatus` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policy_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','platform_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `enterpriseId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `portalUserId` int;--> statement-breakpoint
ALTER TABLE `annual_objectives` ADD CONSTRAINT `annual_objectives_planId_policy_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `policy_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bowling_entries` ADD CONSTRAINT `bowling_entries_kpiId_policy_kpis_id_fk` FOREIGN KEY (`kpiId`) REFERENCES `policy_kpis`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `breakthrough_objectives` ADD CONSTRAINT `breakthrough_objectives_planId_policy_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `policy_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deployment_audits` ADD CONSTRAINT `deployment_audits_deploymentTargetId_deployment_targets_id_fk` FOREIGN KEY (`deploymentTargetId`) REFERENCES `deployment_targets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deployment_metrics` ADD CONSTRAINT `deployment_metrics_deploymentTargetId_deployment_targets_id_fk` FOREIGN KEY (`deploymentTargetId`) REFERENCES `deployment_targets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deployment_targets` ADD CONSTRAINT `deployment_targets_planId_policy_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `policy_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `improvement_projects` ADD CONSTRAINT `improvement_projects_planId_policy_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `policy_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `metric_push_logs` ADD CONSTRAINT `metric_push_logs_deploymentTargetId_deployment_targets_id_fk` FOREIGN KEY (`deploymentTargetId`) REFERENCES `deployment_targets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `policy_correlations` ADD CONSTRAINT `policy_correlations_planId_policy_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `policy_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `policy_kpis` ADD CONSTRAINT `policy_kpis_planId_policy_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `policy_plans`(`id`) ON DELETE no action ON UPDATE no action;