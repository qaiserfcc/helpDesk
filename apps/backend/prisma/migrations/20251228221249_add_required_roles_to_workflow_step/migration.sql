/*
  Warnings:

  - You are about to drop the column `requiredRole` on the `WorkflowStep` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WorkflowStep" DROP COLUMN "requiredRole",
ADD COLUMN     "requireAllRoles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredRoles" "Role"[] DEFAULT ARRAY[]::"Role"[];
