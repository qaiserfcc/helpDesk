-- CreateEnum
CREATE TYPE "TicketActivityType" AS ENUM ('status_change', 'assignment_change');

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "TicketActivityType" NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus",
    "fromAssigneeId" TEXT,
    "toAssigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketActivity_ticketId_idx" ON "TicketActivity"("ticketId");

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_fromAssigneeId_fkey" FOREIGN KEY ("fromAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_toAssigneeId_fkey" FOREIGN KEY ("toAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
