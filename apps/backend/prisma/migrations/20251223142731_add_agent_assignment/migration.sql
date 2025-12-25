-- CreateTable
CREATE TABLE "AgentAssignment" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "agentId" TEXT NOT NULL,
    "priority" "TicketPriority",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentAssignment_categoryId_idx" ON "AgentAssignment"("categoryId");

-- CreateIndex
CREATE INDEX "AgentAssignment_subcategoryId_idx" ON "AgentAssignment"("subcategoryId");

-- CreateIndex
CREATE INDEX "AgentAssignment_agentId_idx" ON "AgentAssignment"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAssignment_categoryId_subcategoryId_agentId_priority_key" ON "AgentAssignment"("categoryId", "subcategoryId", "agentId", "priority");

-- AddForeignKey
ALTER TABLE "AgentAssignment" ADD CONSTRAINT "AgentAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAssignment" ADD CONSTRAINT "AgentAssignment_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "TicketSubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAssignment" ADD CONSTRAINT "AgentAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
