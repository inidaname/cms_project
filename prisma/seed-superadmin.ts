import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PLATFORM_TENANT_DOMAIN = "platform";
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY ?? `cas_key_platform_${Date.now()}`;

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME ?? "Platform Admin";

  if (!email || !password) {
    console.error(
      "❌ SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD environment variables are required."
    );
    console.error("   Usage: SUPERADMIN_EMAIL=admin@example.com SUPERADMIN_PASSWORD=secret123 npm run seed:superadmin");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ SUPERADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  // 1. Ensure the dedicated platform tenant exists (satisfies User's tenant relation)
  const platformTenant = await prisma.tenant.upsert({
    where: { domain: PLATFORM_TENANT_DOMAIN },
    update: { name: "Platform", status: "ACTIVE" },
    create: {
      name: "Platform",
      domain: PLATFORM_TENANT_DOMAIN,
      apiKey: PLATFORM_API_KEY,
      status: "ACTIVE",
    },
  });

  // 2. Create or update the super admin user
  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findFirst({
    where: { email, role: "SUPER_ADMIN" },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hashedPassword, name },
    });
    console.log(`✅ Super admin password updated: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        agreed: true,
        tenant_id: platformTenant.id,
      },
    });
    console.log(`✅ Super admin created: ${email}`);
  }

  console.log(`✅ Platform tenant: ${platformTenant.domain} (id: ${platformTenant.id})`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
