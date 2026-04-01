-- Migrate breakthrough_objectives.boCategory: morale → people
ALTER TABLE `breakthrough_objectives` MODIFY COLUMN `boCategory` enum('safety','cost','delivery','quality','people') NOT NULL;
--> statement-breakpoint
-- Update any existing rows with the old 'morale' value
UPDATE `breakthrough_objectives` SET `boCategory` = 'people' WHERE `boCategory` = 'morale';
--> statement-breakpoint
-- Migrate improvement_projects.projCategory: strategic/operational/improvement → SQDCP pillars
-- Map closest equivalents before altering the column
UPDATE `improvement_projects` SET `projCategory` = 'cost'     WHERE `projCategory` = 'improvement';
--> statement-breakpoint
UPDATE `improvement_projects` SET `projCategory` = 'quality'  WHERE `projCategory` = 'operational';
--> statement-breakpoint
UPDATE `improvement_projects` SET `projCategory` = 'delivery' WHERE `projCategory` = 'strategic';
--> statement-breakpoint
ALTER TABLE `improvement_projects` MODIFY COLUMN `projCategory` enum('safety','quality','delivery','cost','people') NOT NULL DEFAULT 'cost';
