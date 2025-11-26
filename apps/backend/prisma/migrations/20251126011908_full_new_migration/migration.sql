/*
  Warnings:

  - You are about to drop the column `socketId` on the `DeviceToken` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DeviceToken_socketId_idx";

-- AlterTable
ALTER TABLE "DeviceToken" DROP COLUMN "socketId";
