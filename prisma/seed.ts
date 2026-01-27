import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { Resend } from "resend";
import crypto from "crypto";

import { sendTenantWelcomeEmail } from "../src/helpers/mail";

const prisma = new PrismaClient();
// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const email = "saniyhassan@gmail.com";

  // 1. Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists. Skipping seed.`);
    return;
  }

  // 2. Generate secure credentials
  // Generates a 16-character random password
  const rawPassword = crypto.randomBytes(8).toString("hex");
  const apiKey = `sk_live_${crypto.randomBytes(24).toString("hex")}`;
  const hashedPassword = await bcrypt.hash(rawPassword, 12);

  try {
    // 3. Create Tenant and User in a transaction
    const newTenant = await prisma.tenant.create({
      data: {
        name: "MainHeart Ltd",
        domain: "https://www.mainheart.org",
        apiKey: apiKey,
        users: {
          create: {
            email: email,
            name: "Sani Hassan",
            password: hashedPassword,
            role: "OWNER",
            agreed: true,
          },
        },
      },
    });

    console.log(`✅ Created Tenant: ${newTenant.domain}`);

    const sendEmail = await sendTenantWelcomeEmail({
      from: "Hassan Sani <hassan@mainheart.org>",
      content: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h1>Welcome, Saniy!</h1>
          <p>Your tenant account has been provisioned. Here are your credentials:</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px;">
            <p><strong>Login Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code>${rawPassword}</code></p>
            <p><strong>API Key:</strong> <code>${apiKey}</code></p>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Please change your password immediately after logging in.
          </p>
        </div>
      `,
      email,
      subject: "Your Account & API Access Details",
    });

    console.log("📧 Email sent successfully:", sendEmail?.id);
  } catch (err) {
    console.error("❌ Error during seeding:", err);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
