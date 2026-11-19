// src/lib/mail.ts
import {
  createPlatformEmailProvider,
  type EmailSendResult,
} from "../utils/email";

const emailProvider = createPlatformEmailProvider();

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
}: SendWelcomeDetails): Promise<EmailSendResult> => {
  return await emailProvider.send({ from, to: email, subject, html: content });
};
