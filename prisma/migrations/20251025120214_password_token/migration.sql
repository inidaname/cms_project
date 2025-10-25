-- CreateTable
CREATE TABLE "PasswordToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tokenHash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_tenant_id_user_id_key" ON "PasswordToken"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
