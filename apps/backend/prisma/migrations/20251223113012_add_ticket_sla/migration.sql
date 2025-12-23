-- CreateTable TicketSLA
CREATE TABLE "public"."TicketSLA" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "priority" TEXT NOT NULL,
    "responseTimeMinutes" INTEGER NOT NULL,
    "resolutionTimeMinutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSLA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketSLA_name_key" ON "public"."TicketSLA"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSLA_categoryId_subcategoryId_priority_key" ON "public"."TicketSLA"("categoryId", "subcategoryId", "priority");

-- CreateIndex
CREATE INDEX "TicketSLA_categoryId_idx" ON "public"."TicketSLA"("categoryId");

-- CreateIndex
CREATE INDEX "TicketSLA_subcategoryId_idx" ON "public"."TicketSLA"("subcategoryId");

-- AddForeignKey
ALTER TABLE "public"."TicketSLA" ADD CONSTRAINT "TicketSLA_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."TicketCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketSLA" ADD CONSTRAINT "TicketSLA_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "public"."TicketSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
