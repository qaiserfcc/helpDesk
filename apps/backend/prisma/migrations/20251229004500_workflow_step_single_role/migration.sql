/*
  Warnings:

  - You are about to drop the column `requiredRoles` on the `WorkflowStep` table. All the data in the column will be lost.
  - You are about to drop the column `requireAllRoles` on the `WorkflowStep` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WorkflowStep" DROP COLUMN "requiredRoles",
DROP COLUMN "requireAllRoles",
ADD COLUMN     "requiredRole" "Role";
