/*
  Warnings:

  - The `status` column on the `Tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `TenantUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenant_id,email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DELETED', 'OUTDATED', 'ABANDONED');

-- DropForeignKey
ALTER TABLE "public"."TenantUser" DROP CONSTRAINT "TenantUser_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."TenantUser" DROP CONSTRAINT "TenantUser_user_id_fkey";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "status",
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- DropTable
DROP TABLE "public"."TenantUser";

-- CreateIndex
CREATE UNIQUE INDEX "User_tenant_id_email_key" ON "User"("tenant_id", "email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
