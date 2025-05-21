/*
  Warnings:

  - You are about to drop the column `adminComment` on the `Appeal` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `Appeal` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `Appeal` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the `CustomerTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `Appeal` DROP COLUMN `adminComment`,
    DROP COLUMN `processedAt`,
    DROP COLUMN `remarks`,
    ADD COLUMN `previousAppealId` INTEGER NULL,
    MODIFY `evidence` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `customers` DROP COLUMN `department`;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'PARTNER', 'USER') NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE `CustomerTag`;

-- CreateTable
CREATE TABLE `customer_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Appeal_operatorId_idx` ON `Appeal`(`operatorId`);

-- CreateIndex
CREATE INDEX `Appeal_previousAppealId_idx` ON `Appeal`(`previousAppealId`);
