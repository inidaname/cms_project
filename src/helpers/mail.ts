// src/lib/mail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendWelcomeDetails {
  email: string;
  content: string;
  from?: string;
  subject: string;
}

export const sendTenantWelcomeEmail = async ({
  email,
  from = "Hassan Sani <hassan@mainheart.org>",
  content,
  subject,
}: SendWelcomeDetails) => {
  const { data, error } = await resend.emails.send({
    from,
    to: [email],
    subject,
    html: content,
  });

  if (error) {
    console.log(`Resend Error: ${error.message}`);
  }

  return data;
};
