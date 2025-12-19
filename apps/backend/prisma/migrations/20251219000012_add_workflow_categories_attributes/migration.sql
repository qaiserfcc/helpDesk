-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('text', 'number', 'select', 'multiselect', 'date', 'boolean');

-- CreateEnum
CREATE TYPE "WorkflowStepAction" AS ENUM ('create', 'update', 'assign', 'resolve', 'escalate', 'comment');

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSubcategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "AttributeType" NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "defaultValue" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttributeValue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "initiatorRole" "Role",
    "allowedActions" JSONB NOT NULL,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketWorkflowStep" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "actorId" TEXT,
    "notes" TEXT,

    CONSTRAINT "TicketWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "subcategoryId" TEXT,
ADD COLUMN     "workflowId" TEXT,
ADD COLUMN     "currentStepId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TicketCategory_name_key" ON "TicketCategory"("name");

-- CreateIndex
CREATE INDEX "TicketSubcategory_categoryId_idx" ON "TicketSubcategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSubcategory_categoryId_name_key" ON "TicketSubcategory"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TicketAttribute_name_key" ON "TicketAttribute"("name");

-- CreateIndex
CREATE INDEX "TicketAttributeValue_ticketId_idx" ON "TicketAttributeValue"("ticketId");

-- CreateIndex
CREATE INDEX "TicketAttributeValue_attributeId_idx" ON "TicketAttributeValue"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketAttributeValue_ticketId_attributeId_key" ON "TicketAttributeValue"("ticketId", "attributeId");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_categoryId_idx" ON "WorkflowDefinition"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_categoryId_version_key" ON "WorkflowDefinition"("categoryId", "version");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowId_order_key" ON "WorkflowStep"("workflowId", "order");

-- CreateIndex
CREATE INDEX "TicketWorkflowStep_ticketId_idx" ON "TicketWorkflowStep"("ticketId");

-- CreateIndex
CREATE INDEX "TicketWorkflowStep_stepId_idx" ON "TicketWorkflowStep"("stepId");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "Ticket"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_subcategoryId_idx" ON "Ticket"("subcategoryId");

-- CreateIndex
CREATE INDEX "Ticket_workflowId_idx" ON "Ticket"("workflowId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "TicketSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSubcategory" ADD CONSTRAINT "TicketSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttributeValue" ADD CONSTRAINT "TicketAttributeValue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttributeValue" ADD CONSTRAINT "TicketAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "TicketAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketWorkflowStep" ADD CONSTRAINT "TicketWorkflowStep_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketWorkflowStep" ADD CONSTRAINT "TicketWorkflowStep_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
