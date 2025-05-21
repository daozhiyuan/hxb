-- AlterTable
ALTER TABLE `Appeal` ADD COLUMN `processedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `department` VARCHAR(100) NULL,
    ADD COLUMN `followUpStatus` VARCHAR(50) NULL,
    ADD COLUMN `industry` VARCHAR(100) NULL,
    ADD COLUMN `lastContactedAt` DATETIME(3) NULL,
    ADD COLUMN `lastFollowUpAt` DATETIME(3) NULL,
    ADD COLUMN `logs` JSON NULL,
    ADD COLUMN `nextFollowUpAt` DATETIME(3) NULL,
    ADD COLUMN `position` VARCHAR(100) NULL,
    ADD COLUMN `priority` VARCHAR(20) NULL,
    ADD COLUMN `source` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `FollowUp` ADD COLUMN `attachments` JSON NULL,
    ADD COLUMN `duration` INTEGER NULL DEFAULT 30,
    ADD COLUMN `location` VARCHAR(200) NULL,
    ADD COLUMN `nextSteps` VARCHAR(191) NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `outcome` VARCHAR(100) NULL,
    ADD COLUMN `participants` JSON NULL,
    ADD COLUMN `sentiment` VARCHAR(20) NULL;
