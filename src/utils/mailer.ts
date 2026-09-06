import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Forex Lab";

export function getRequestOrigin(req?: { headers: { get: (name: string) => string | null } }): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) {
      return `${proto}://${host}`;
    }
  }
  return "http://localhost:3000";
}

export function getMailer(): nodemailer.Transporter {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD
    }
  });
}

export const getMailTransporter = getMailer;

export function isMailerConfigured(): boolean {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function passwordResetEmailHtml(name: string, resetLink: string): string {
  const safeName = escapeHtml(name || "Trader");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password - ForexLab</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070b09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f7f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #070b09; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%; background: #111714; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: rgba(34, 224, 143, 0.03);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background: #22e08f; color: #04160e; font-weight: 800; font-size: 13px; letter-spacing: 0.05em; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace;">FX</span>
                    <span style="color: #f4f7f5; font-size: 16px; font-weight: 700; margin-left: 8px; letter-spacing: -0.02em;">ForexLab <span style="color: #22e08f; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">PRO JOURNAL</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #f4f7f5; line-height: 1.3;">
                Reset your password
              </h1>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #a1ada5;">
                Hello <strong>${safeName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #a1ada5;">
                A password reset request was initiated for your ForexLab account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: #22e08f;">
                    <a href="${resetLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #04160e; text-decoration: none; border-radius: 8px; letter-spacing: -0.01em;">
                      Set New Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #6d7b73;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; line-height: 1.5; word-break: break-all;">
                <a href="${resetLink}" style="color: #22e08f; text-decoration: underline;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: rgba(0, 0, 0, 0.25); border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #6d7b73;">
                If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmailText(name: string, resetLink: string): string {
  return `Hello ${name || "Trader"},

A password reset request was initiated for your ForexLab account. Use the link below to choose a new password. This link is valid for 1 hour:

${resetLink}

If you did not request this password reset, please ignore this email — your password will remain unchanged.

Best regards,
ForexLab Pro Journal Team`;
}

export async function sendResetEmail(
  to: string,
  resetUrl: string,
  name: string = "Trader"
): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER || GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    console.warn(`[Mailer] Cannot send reset email to ${to}: GMAIL_USER or GMAIL_APP_PASSWORD is not set.`);
    return false;
  }

  try {
    const transporter = getMailer();
    const fromAddress = `"ForexLab" <${gmailUser}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: "Reset your ForexLab Password",
      text: passwordResetEmailText(name, resetUrl),
      html: passwordResetEmailHtml(name, resetUrl)
    });

    console.log(`[Mailer] Password reset email sent to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[Mailer] Failed to send password reset email to ${to}:`, error);
    return false;
  }
}

export async function sendPasswordResetEmail({
  name = "Trader",
  email,
  resetLink
}: {
  name?: string;
  email: string;
  resetLink: string;
}): Promise<boolean> {
  return sendResetEmail(email, resetLink, name);
}
