-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('text', 'number', 'date', 'select', 'multiselect');

-- DropForeignKey
ALTER TABLE "AiSuggestion" DROP CONSTRAINT "AiSuggestion_ticketId_fkey";

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "AttributeType" NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "visibleTo" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttributeValue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_key_key" ON "Attribute"("key");

-- CreateIndex
CREATE INDEX "TicketAttributeValue_ticketId_idx" ON "TicketAttributeValue"("ticketId");

-- CreateIndex
CREATE INDEX "TicketAttributeValue_attributeId_idx" ON "TicketAttributeValue"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketAttributeValue_ticketId_attributeId_key" ON "TicketAttributeValue"("ticketId", "attributeId");

-- AddForeignKey
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttributeValue" ADD CONSTRAINT "TicketAttributeValue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttributeValue" ADD CONSTRAINT "TicketAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
