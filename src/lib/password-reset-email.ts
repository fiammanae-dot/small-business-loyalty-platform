import "server-only";

export type PasswordResetEmail = {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export function buildPasswordResetEmail({ resetUrl, expiresInMinutes }: PasswordResetEmail) {
  const subject = "Reset Your LoyaltyBase Password";
  const text = [
    "Reset your LoyaltyBase password",
    "",
    "We received a request to reset your password.",
    `This link expires in ${expiresInMinutes} minutes.`,
    "",
    resetUrl,
    "",
    "If you did not request this reset, you can ignore this email. Your password will not change unless the link is used.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1E293B; line-height: 1.6;">
      <h1 style="color: #1E293B;">Reset your LoyaltyBase password</h1>
      <p>We received a request to reset your password.</p>
      <p>This link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; background: #F97316; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
          Reset Password
        </a>
      </p>
      <p style="color: #64748B;">If you did not request this reset, you can ignore this email. Your password will not change unless the link is used.</p>
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