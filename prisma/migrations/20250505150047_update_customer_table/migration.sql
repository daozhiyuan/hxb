/*
  Warnings:

  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `Customer`;

-- CreateTable
CREATE TABLE `customers` (
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
    `address` VARCHAR(191) NULL,
    `idCardHash` VARCHAR(191) NULL,
    `idCardNumberEncrypted` VARCHAR(191) NULL,
    `lastYearRevenue` DOUBLE NULL,
    `department` VARCHAR(100) NULL,
    `followUpStatus` VARCHAR(50) NULL,
    `industry` VARCHAR(100) NULL,
    `lastContactedAt` DATETIME(3) NULL,
    `lastFollowUpAt` DATETIME(3) NULL,
    `logs` JSON NULL,
    `nextFollowUpAt` DATETIME(3) NULL,
    `position` VARCHAR(100) NULL,
    `priority` VARCHAR(20) NULL,
    `source` VARCHAR(50) NULL,

    UNIQUE INDEX `customers_idCardHash_key`(`idCardHash`),
    INDEX `customers_registeredByPartnerId_idx`(`registeredByPartnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
