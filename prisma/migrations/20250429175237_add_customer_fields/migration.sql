/*
  Warnings:

  - A unique constraint covering the columns `[idCardHash]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `idCardHash` VARCHAR(191) NULL,
    ADD COLUMN `idCardNumberEncrypted` VARCHAR(191) NULL,
    ADD COLUMN `lastYearRevenue` DOUBLE NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Customer_idCardHash_key` ON `Customer`(`idCardHash`);
