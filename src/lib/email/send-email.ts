import nodemailer from "nodemailer";

export interface PasswordResetEmailOptions {
  to: string;
  resetUrl: string;
  userName?: string;
}

/**
 * Sends a password reset email to the user.
 * If SMTP configuration is present in environment variables, sends via real SMTP.
 * If SMTP is not configured (e.g. in local development), logs the link to the secure server console.
 * Under NO circumstances is the reset link ever returned in an HTTP API response.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: PasswordResetEmailOptions): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;
  const fromEmail = process.env.EMAIL_FROM || '"WTS-FinCore Security" <security@fincore.com>';

  const subject = "WTS-FinCore Password Reset Request";
  const greeting = userName ? `Hello ${userName},` : "Hello,";

  const textBody = `
${greeting}

A password reset request was submitted for your WTS-FinCore account (${to}).

To set a new password, please visit the following secure link:
${resetUrl}

This link is valid for 1 hour and can only be used once.

If you did not request a password reset, please ignore this email or contact your administrator immediately.

Best regards,
WTS-FinCore Security Team
`.trim();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <div style="margin-bottom: 24px; text-align: center;">
    <h2 style="color: #0f172a; margin: 0; font-size: 20px;">WTS-FinCore Password Reset</h2>
  </div>
  <p style="color: #334155; font-size: 15px; line-height: 1.5;">${greeting}</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.5;">
    A password reset request was submitted for your account (<strong>${to}</strong>).
  </p>
  <div style="margin: 32px 0; text-align: center;">
    <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
      Reset Your Password
    </a>
  </div>
  <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
    If the button above does not work, copy and paste this URL into your browser:<br />
    <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px; line-height: 1.4;">
    This link is valid for <strong>1 hour</strong> and can only be used once.<br />
    If you did not request this reset, no action is required and your account remains safe.
  </p>
</div>
`.trim();

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      });

      return { success: true };
    } catch (err: any) {
      console.error("[EMAIL_DISPATCH_ERROR] Failed to send password reset email via SMTP:", err?.message || err);
      return { success: false, error: err?.message || "Failed to send email via SMTP" };
    }
  }

  // Fallback for development/testing environments without external SMTP configuration
  console.info(`[SECURITY_AUDIT][DEV_EMAIL_FALLBACK] Password reset link for ${to}:\n  Link: ${resetUrl}`);
  return { success: true };
}
