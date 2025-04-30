/*
  Warnings:

  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'PARTNER', 'USER') NOT NULL DEFAULT 'USER',
    MODIFY `isActive` BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE `customers`;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `status` ENUM('FOLLOWING', 'NEGOTIATING', 'PENDING', 'SIGNED', 'COMPLETED', 'LOST') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `registrationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `jobTitle` VARCHAR(191) NULL,
    `registeredByPartnerId` INTEGER NOT NULL,

    INDEX `Customer_registeredByPartnerId_idx`(`registeredByPartnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FollowUp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `customerId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,

    INDEX `FollowUp_customerId_idx`(`customerId`),
    INDEX `FollowUp_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
