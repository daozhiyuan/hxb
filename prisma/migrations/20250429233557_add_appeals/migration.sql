-- CreateTable
CREATE TABLE `Appeal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerName` VARCHAR(191) NOT NULL,
    `idNumber` VARCHAR(191) NOT NULL,
    `idNumberHash` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `evidence` JSON NULL,
    `status` ENUM('pending', 'processing', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `remarks` TEXT NULL,
    `partnerId` INTEGER NOT NULL,
    `operatorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Appeal_idNumberHash_key`(`idNumberHash`),
    INDEX `Appeal_status_idx`(`status`),
    INDEX `Appeal_partnerId_idx`(`partnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppealLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appealId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `remarks` TEXT NULL,
    `operatorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AppealLog_appealId_idx`(`appealId`),
    INDEX `AppealLog_operatorId_idx`(`operatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
