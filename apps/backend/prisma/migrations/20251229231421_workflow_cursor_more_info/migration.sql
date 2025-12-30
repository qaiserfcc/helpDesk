-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "currentWorkflowStepId" TEXT,
ADD COLUMN     "moreInfoCommentId" TEXT,
ADD COLUMN     "moreInfoQuestion" TEXT,
ADD COLUMN     "moreInfoRequestedAt" TIMESTAMP(3),
ADD COLUMN     "moreInfoRequestedBy" TEXT,
ADD COLUMN     "moreInfoResolvedAt" TIMESTAMP(3),
ADD COLUMN     "moreInfoResolvedBy" TEXT,
ADD COLUMN     "moreInfoResponseCommentId" TEXT,
ADD COLUMN     "moreInfoStepId" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_currentWorkflowStepId_fkey" FOREIGN KEY ("currentWorkflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_moreInfoRequestedBy_fkey" FOREIGN KEY ("moreInfoRequestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_moreInfoStepId_fkey" FOREIGN KEY ("moreInfoStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_moreInfoResolvedBy_fkey" FOREIGN KEY ("moreInfoResolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
