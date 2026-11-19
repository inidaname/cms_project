// Email provider contract: the platform currently sends via Resend; tenant
// campaigns use tenant-configured SMTP (nodemailer) elsewhere. Selection is
// configuration-driven and failures are explicit — a missing provider never
// silently "succeeds".

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export type EmailSendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

interface ResendLike {
  emails: {
    send(input: {
      from: string;
      to: string[];
      subject: string;
      html: string;
    }): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
  };
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private client: ResendLike) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const response = await this.client.emails.send({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      });
      if (response.error) {
        return { ok: false, error: response.error.message || "Email send failed" };
      }
      return { ok: true, id: response.data?.id ?? null };
    } catch (error) {
      return { ok: false, error: (error as Error)?.message || "Email send failed" };
    }
  }
}

export class NullEmailProvider implements EmailProvider {
  async send(): Promise<EmailSendResult> {
    return {
      ok: false,
      error: "Email provider is not configured (RESEND_API_KEY missing)",
    };
  }
}

/**
 * Selects the platform email provider from configuration. Resend requires an
 * API key; without one the Null provider makes the missing configuration
 * explicit on every send attempt (callers log and continue: delivery stays
 * best-effort where documented).
 */
export function createPlatformEmailProvider(
  env: { RESEND_API_KEY?: string } = process.env,
): EmailProvider {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return new NullEmailProvider();
  }
  // Lazy import keeps the provider swappable without changing call sites.
  const { Resend } = require("resend");
  return new ResendEmailProvider(new Resend(apiKey) as unknown as ResendLike);
}
