-- AlterTable
ALTER TABLE "CartItems" ADD COLUMN     "configuration" JSON;

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "organization_id" UUID;

-- CreateTable
CREATE TABLE "OfferingType" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selectable" BOOLEAN NOT NULL DEFAULT false,
    "scheduled" BOOLEAN NOT NULL DEFAULT false,
    "participants" BOOLEAN NOT NULL DEFAULT false,
    "deliverable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionChoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "product_id" UUID,
    "price_delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferingSlot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferingType_tenant_id_idx" ON "OfferingType"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "OfferingType_tenant_id_key_key" ON "OfferingType"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "OptionGroup_tenant_id_product_id_idx" ON "OptionGroup"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "OptionChoice_tenant_id_group_id_idx" ON "OptionChoice"("tenant_id", "group_id");

-- CreateIndex
CREATE INDEX "OfferingSlot_tenant_id_product_id_startsAt_idx" ON "OfferingSlot"("tenant_id", "product_id", "startsAt");

-- CreateIndex
CREATE INDEX "Organization_tenant_id_idx" ON "Organization"("tenant_id");

-- CreateIndex
CREATE INDEX "SaleParticipant_tenant_id_sale_id_idx" ON "SaleParticipant"("tenant_id", "sale_id");

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingType" ADD CONSTRAINT "OfferingType_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingSlot" ADD CONSTRAINT "OfferingSlot_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingSlot" ADD CONSTRAINT "OfferingSlot_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleParticipant" ADD CONSTRAINT "SaleParticipant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleParticipant" ADD CONSTRAINT "SaleParticipant_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
