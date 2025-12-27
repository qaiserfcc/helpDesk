-- AlterEnum
ALTER TYPE "TicketActivityType" ADD VALUE 'comment';
ALTER TYPE "TicketActivityType" ADD VALUE 'reply';
ALTER TYPE "TicketActivityType" ADD VALUE 'mark_for_info';
ALTER TYPE "TicketActivityType" ADD VALUE 'workflow_step_change';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "slaId" TEXT,
ADD COLUMN "firstResponseAt" TIMESTAMP(3),
ADD COLUMN "slaResponseBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "slaResolutionBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "markedForInfo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "markedForInfoAt" TIMESTAMP(3),
ADD COLUMN "markedForInfoBy" TEXT;

-- AlterTable
ALTER TABLE "TicketActivity" ADD COLUMN "content" TEXT,
ADD COLUMN "fromStepId" TEXT,
ADD COLUMN "toStepId" TEXT,
ADD COLUMN "cannedResponseId" TEXT,
ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_assignedTo_idx" ON "Ticket"("assignedTo");

-- CreateIndex
CREATE INDEX "Ticket_createdBy_idx" ON "Ticket"("createdBy");

-- CreateIndex
CREATE INDEX "TicketActivity_actorId_idx" ON "TicketActivity"("actorId");
