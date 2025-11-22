-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "assignmentRequestId" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignmentRequestId_fkey" FOREIGN KEY ("assignmentRequestId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
