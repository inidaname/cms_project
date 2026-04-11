/*
  Warnings:

  - You are about to drop the column `tenantId` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `EmailSend` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `Subscriber` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenant_id,email]` on the table `Subscriber` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `EmailSend` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `List` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Subscriber` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Campaign" DROP CONSTRAINT "Campaign_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailSend" DROP CONSTRAINT "EmailSend_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."List" DROP CONSTRAINT "List_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Subscriber" DROP CONSTRAINT "Subscriber_tenantId_fkey";

-- DropIndex
DROP INDEX "public"."Subscriber_tenantId_email_key";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "tenantId",
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "EmailSend" DROP COLUMN "tenantId",
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "List" DROP COLUMN "tenantId",
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Payments" ADD COLUMN     "authType" TEXT,
ADD COLUMN     "finecoreReference" TEXT,
ADD COLUMN     "finecoreTransactionRef" TEXT,
ADD COLUMN     "requiresAuth" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscriber" DROP COLUMN "tenantId",
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "TenantFinecoreConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apiKey" TEXT NOT NULL,
    "publicKey" TEXT,
    "webhookSecret" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "tenant_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFinecoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantFinecoreConfig_tenant_id_key" ON "TenantFinecoreConfig"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_tenant_id_email_key" ON "Subscriber"("tenant_id", "email");

-- AddForeignKey
ALTER TABLE "TenantFinecoreConfig" ADD CONSTRAINT "TenantFinecoreConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSend" ADD CONSTRAINT "EmailSend_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
