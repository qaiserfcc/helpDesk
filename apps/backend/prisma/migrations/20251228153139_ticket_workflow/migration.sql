-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketActivityType" ADD VALUE 'comment';
ALTER TYPE "TicketActivityType" ADD VALUE 'reply';
ALTER TYPE "TicketActivityType" ADD VALUE 'step_completed';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "workflowId" TEXT;

-- AlterTable
ALTER TABLE "TicketActivity" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "commentId" TEXT,
ADD COLUMN     "stepId" TEXT;

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roleFilter" "Role",
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requiredRole" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepCompletion" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "completedBy" TEXT NOT NULL,
    "comment" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStepCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_categoryId_idx" ON "Workflow"("categoryId");

-- CreateIndex
CREATE INDEX "Workflow_subcategoryId_idx" ON "Workflow"("subcategoryId");

-- CreateIndex
CREATE INDEX "Workflow_roleFilter_idx" ON "Workflow"("roleFilter");

-- CreateIndex
CREATE INDEX "Workflow_isDefault_idx" ON "Workflow"("isDefault");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowStep_order_idx" ON "WorkflowStep"("order");

-- CreateIndex
CREATE INDEX "WorkflowStepCompletion_ticketId_idx" ON "WorkflowStepCompletion"("ticketId");

-- CreateIndex
CREATE INDEX "WorkflowStepCompletion_stepId_idx" ON "WorkflowStepCompletion"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStepCompletion_ticketId_stepId_key" ON "WorkflowStepCompletion"("ticketId", "stepId");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketComment_parentId_idx" ON "TicketComment"("parentId");

-- CreateIndex
CREATE INDEX "TicketComment_authorId_idx" ON "TicketComment"("authorId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepCompletion" ADD CONSTRAINT "WorkflowStepCompletion_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepCompletion" ADD CONSTRAINT "WorkflowStepCompletion_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TicketComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
