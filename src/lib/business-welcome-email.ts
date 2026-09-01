import "server-only";

export type BusinessWelcomeEmailContent = {
  businessName: string;
  ownerName: string;
  loginUrl: string;
};

export type BusinessWelcomeEmail = BusinessWelcomeEmailContent & {
  to: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildBusinessWelcomeEmail({ businessName, ownerName, loginUrl }: BusinessWelcomeEmailContent) {
  const subject = "Welcome to Loyalty Card UAE";
  const text = [
    "Loyalty Card UAE",
    "Digital Loyalty Platform",
    "",
    "Welcome to Loyalty Card UAE",
    "",
    "Hi " + ownerName + ",",
    "",
    "An account has been created for you as the owner of " + businessName + " on Loyalty Card UAE.",
    "",
    "Sign In: " + loginUrl,
    "",
    "Use this email address and the temporary password provided by your administrator.",
    "You will be prompted to set a new password on your first sign-in.",
    "",
    "Loyalty Card UAE",
    "Digital Loyalty Platform",
    "support@loyaltycarduae.com",
  ].join("\n");

  const safeBusinessName = escapeHtml(businessName);
  const safeOwnerName = escapeHtml(ownerName);

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
                    Welcome to Loyalty Card UAE
                  </h1>
                  <p style="margin:16px 0 0 0; color:#475569; font-size:16px; line-height:1.6;">
                    Hi ${safeOwnerName}, an account has been created for you as the owner of <strong>${safeBusinessName}</strong> on Loyalty Card UAE. Use the button below to sign in to your workspace.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:22px 28px 10px 28px;">
                  <a href="${loginUrl}" style="display:inline-block; min-width:220px; background:#F97316; color:#FFFFFF; padding:14px 22px; border-radius:10px; text-decoration:none; font-size:16px; font-weight:800; text-align:center;">
                    Sign In
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 28px 4px 28px;">
                  <div style="background:#FFF7ED; border:1px solid #FED7AA; border-radius:12px; padding:14px 16px; text-align:center;">
                    <p style="margin:0; color:#9A3412; font-size:14px; line-height:1.5;">
                      Sign in with <strong>this email address</strong> and the temporary password provided by your administrator.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px 28px 28px;">
                  <p style="margin:0; color:#64748B; font-size:14px; line-height:1.6; text-align:center;">
                    You will be prompted to set a new password on your first sign-in.
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
              <span style="word-break:break-all;">${loginUrl}</span>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Best-effort welcome email for a newly created business owner.
 *
 * Unlike the password reset email - which a user is actively waiting on - this
 * one is a courtesy notification, so a missing provider or sender is a silent
 * skip in every environment rather than a thrown error. The owner's account
 * already exists and remains reachable with the temporary password the
 * administrator hands over directly.
 *
 * Reuses PASSWORD_RESET_FROM_EMAIL: there is one transactional sender identity
 * for the platform, so this works with the existing configuration.
 */
export async function sendBusinessWelcomeEmail(message: BusinessWelcomeEmail) {
  const email = buildBusinessWelcomeEmail(message);
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.PASSWORD_RESET_FROM_EMAIL;

  if (!apiKey) {
    console.info("Business welcome email skipped: RESEND_API_KEY is not configured.", {
      to: message.to,
      subject: email.subject,
    });
    return { delivered: false, provider: "resend_not_configured" as const };
  }

  if (!fromEmail) {
    console.info("Business welcome email skipped: PASSWORD_RESET_FROM_EMAIL is not configured.", {
      to: message.to,
      subject: email.subject,
    });
    return { delivered: false, provider: "sender_not_configured" as const };
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
    console.error("Business welcome email failed: Resend rejected the request.", {
      status: response.status,
    });
    throw new Error(`Business welcome email provider failed with ${response.status}.`);
  }

  return { delivered: true, provider: "resend" as const };
}
