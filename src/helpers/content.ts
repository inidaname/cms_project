import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Hassan Sani <hassan@mainheart.org>";

// --- Shared Styles ---
const styles = {
  container:
    "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;",
  header:
    "background-color: #000; color: #fff; padding: 30px; text-align: center;",
  body: "padding: 30px;",
  codeBox:
    "background: #f4f4f7; padding: 15px; border-radius: 8px; border: 1px solid #e1e1e8; font-family: monospace; margin: 20px 0;",
  button:
    "display: inline-block; background: #0070f3; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 20px;",
  footer:
    "background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888;",
};

// --- 1. Welcome New Tenant (Owner/Admin) ---
export const sendTenantWelcomeEmail = async (params: {
  email: string;
  name: string;
  tenantName: string;
  password?: string;
  apiKey: string;
  domain: string;
}) => {
  const { email, name, tenantName, password, apiKey, domain } = params;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `Welcome to ${tenantName} - Your Workspace is Ready`,
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="margin:0;">Setup Complete</h1>
        </div>
        <div style="${styles.body}">
          <h2>Hello ${name},</h2>
          <p>Your new organization <strong>${tenantName}</strong> has been successfully created. You can now start managing your products and sales.</p>
          
          <p><strong>Your Access Details:</strong></p>
          <div style="${styles.codeBox}">
            <p style="margin: 5px 0;"><strong>Workspace URL:</strong> ${domain}.yourapp.com</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            ${password ? `<p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>` : ""}
          </div>

          <p><strong>Your Admin API Key:</strong></p>
          <div style="${styles.codeBox}">
            <code style="word-break: break-all; color: #d63384;">${apiKey}</code>
          </div>
          <p style="font-size: 13px; color: #666;">Keep this key secret. It provides full access to your tenant data.</p>

          <a href="https://app.yourapp.com/login" style="${styles.button}">Go to Dashboard</a>
        </div>
        <div style="${styles.footer}">
          &copy; ${new Date().getFullYear()} Your Platform. All rights reserved.
        </div>
      </div>
    `,
  });
};

// --- 2. Welcome New User (Team Member) ---
export const sendUserWelcomeEmail = async (params: {
  email: string;
  name: string;
  tenantName: string;
  password?: string;
}) => {
  const { email, name, tenantName, password } = params;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `You've been added to ${tenantName}`,
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="margin:0;">Welcome Aboard</h1>
        </div>
        <div style="${styles.body}">
          <h2>Hi ${name},</h2>
          <p>You have been invited to join <strong>${tenantName}</strong> on our platform.</p>
          
          <p>Your account has been created with the following credentials:</p>
          <div style="${styles.codeBox}">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            ${password ? `<p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${password}</p>` : ""}
          </div>

          <p>Once you log in, you can view your dashboard and start collaborating with your team.</p>

          <a href="https://app.yourapp.com/login" style="${styles.button}">Login to Workspace</a>
          
          <p style="font-size: 13px; color: #666; margin-top: 25px;">
            If you were not expecting this invitation, please ignore this email.
          </p>
        </div>
        <div style="${styles.footer}">
          You are receiving this because you were added to the ${tenantName} workspace.
        </div>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (params: {
  email: string;
  name: string;
  tenantName: string;
  token: string;
  expiresAt: Date;
}) => {
  const { email, name, tenantName, token, expiresAt } = params;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `Reset your ${tenantName} password`,
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="margin:0;">Password Reset</h1>
        </div>
        <div style="${styles.body}">
          <h2>Hi ${name},</h2>
          <p>We received a request to reset your password for <strong>${tenantName}</strong>.</p>
          <p>Use the following reset token in the password reset form:</p>
          <div style="${styles.codeBox}">
            <code style="word-break: break-all; color: #d63384;">${token}</code>
          </div>
          <p>This token expires at ${expiresAt.toISOString()}.</p>
          <p style="font-size: 13px; color: #666;">If you did not request this, you can safely ignore this email.</p>
        </div>
        <div style="${styles.footer}">
          This password reset token can only be used once.
        </div>
      </div>
    `,
  });
};

export const sendPasswordResetConfirmationEmail = async (params: {
  email: string;
  name: string;
  tenantName: string;
}) => {
  const { email, name, tenantName } = params;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `Your ${tenantName} password was changed`,
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="margin:0;">Password Changed</h1>
        </div>
        <div style="${styles.body}">
          <h2>Hi ${name},</h2>
          <p>Your password for <strong>${tenantName}</strong> was successfully changed.</p>
          <p>If you did not make this change, contact your workspace administrator immediately.</p>
        </div>
        <div style="${styles.footer}">
          This is an account security notification.
        </div>
      </div>
    `,
  });
};

export const sendAuthSecurityEmail = async (params: {
  email: string;
  name: string;
  tenantName: string;
  action: "login" | "logout";
  ipAddress: string;
  userAgent: string;
}) => {
  const { email, name, tenantName, action, ipAddress, userAgent } = params;
  const actionLabel = action === "login" ? "signed in to" : "signed out of";

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: `New ${action} to your ${tenantName} account`,
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="margin:0;">New Account Activity</h1>
        </div>
        <div style="${styles.body}">
          <h2>Hi ${name},</h2>
          <p>Your account ${actionLabel} <strong>${tenantName}</strong> from a new device or location.</p>
          <div style="${styles.codeBox}">
            <p style="margin: 5px 0;"><strong>IP address:</strong> ${ipAddress}</p>
            <p style="margin: 5px 0;"><strong>Device:</strong> ${userAgent}</p>
          </div>
          <p>If this was not you, change your password immediately.</p>
        </div>
        <div style="${styles.footer}">
          This is an account security notification.
        </div>
      </div>
    `,
  });
};
