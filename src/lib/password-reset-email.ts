import "server-only";

export type PasswordResetEmail = {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export function buildPasswordResetEmail({ resetUrl, expiresInMinutes }: PasswordResetEmail) {
  const subject = "Reset Your Loyalty Card UAE Password";
  const text = [
    "Loyalty Card UAE",
    "Digital Loyalty Platform",
    "",
    "Reset Your Password",
    "",
    "We received a request to reset the password for your Loyalty Card UAE account.",
    "Use the link below to create a new password and return to your workspace.",
    "",
    "Reset Password: " + resetUrl,
    "",
    "This reset link expires in " + expiresInMinutes + " minutes.",
    "",
    "If you did not request this password reset, you can safely ignore this email.",
    "",
    "Loyalty Card UAE",
    "Digital Loyalty Platform",
    "support@loyaltycarduae.com",
  ].join("\n");

  const html = `
    <div style="margin:0; padding:0; background:#F8FAFC; font-family:Arial, Helvetica, sans-serif; color:#1E293B;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; background:#F8FAFC; margin:0; padding:0;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; max-width:560px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px; overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 12px 28px; text-align:center;">
                  <div style="display:inline-block; width:48px; height:48px; border-radius:14px; background:#FFF7ED; color:#F97316; font-size:24px; font-weight:800; line-height:48px; text-align:center;">
                    LC
                  </div>
                  <p style="margin:12px 0 0 0; color:#F97316; font-size:13px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;">
                    Loyalty Card UAE
                  </p>
                  <p style="margin:4px 0 0 0; color:#64748B; font-size:13px;">
                    Digital Loyalty Platform
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 28px 8px 28px; text-align:center;">
                  <h1 style="margin:0; color:#1E293B; font-size:28px; line-height:1.2; font-weight:800;">
                    Reset Your Password
                  </h1>
                  <p style="margin:16px 0 0 0; color:#475569; font-size:16px; line-height:1.6;">
                    We received a request to reset the password for your Loyalty Card UAE account. Use the button below to create a new password and return to your workspace.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:22px 28px 10px 28px;">
                  <a href="${resetUrl}" style="display:inline-block; min-width:220px; background:#F97316; color:#FFFFFF; padding:14px 22px; border-radius:10px; text-decoration:none; font-size:16px; font-weight:800; text-align:center;">
                    Reset Password
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 28px 4px 28px;">
                  <div style="background:#FFF7ED; border:1px solid #FED7AA; border-radius:12px; padding:14px 16px; text-align:center;">
                    <p style="margin:0; color:#9A3412; font-size:14px; line-height:1.5;">
                      This reset link expires in <strong>${expiresInMinutes} minutes</strong>.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px 28px 28px;">
                  <p style="margin:0; color:#64748B; font-size:14px; line-height:1.6; text-align:center;">
                    If you did not request this password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#F8FAFC; padding:20px 28px; text-align:center; border-top:1px solid #E2E8F0;">
                  <p style="margin:0; color:#1E293B; font-size:14px; font-weight:800;">Loyalty Card UAE</p>
                  <p style="margin:4px 0 0 0; color:#64748B; font-size:13px;">Digital Loyalty Platform</p>
                  <p style="margin:8px 0 0 0; color:#64748B; font-size:13px;">
                    <a href="mailto:support@loyaltycarduae.com" style="color:#EA580C; text-decoration:none;">support@loyaltycarduae.com</a>
                  </p>
                </td>
              </tr>
            </table>
            <p style="max-width:560px; margin:16px auto 0 auto; color:#94A3B8; font-size:12px; line-height:1.5; text-align:center;">
              If the button does not work, copy and paste this link into your browser:<br />
              <span style="word-break:break-all;">${resetUrl}</span>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
}

export async function sendPasswordResetEmail(message: PasswordResetEmail) {
  const email = buildPasswordResetEmail(message);
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.PASSWORD_RESET_FROM_EMAIL;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("Password reset email skipped: RESEND_API_KEY is not configured.", {
        to: message.to,
        subject: email.subject,
      });
      return { delivered: false, provider: "resend_not_configured" as const };
    }
    console.error("Password reset email failed: RESEND_API_KEY is missing.");
    throw new Error("Password reset email provider is not configured.");
  }

  if (!fromEmail) {
    console.error("Password reset email failed: PASSWORD_RESET_FROM_EMAIL is missing.");
    throw new Error("Password reset sender is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: message.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });

  if (!response.ok) {
    console.error("Password reset email failed: Resend rejected the request.", {
      status: response.status,
    });
    throw new Error(`Password reset email provider failed with ${response.status}.`);
  }

  return { delivered: true, provider: "resend" as const };
}
