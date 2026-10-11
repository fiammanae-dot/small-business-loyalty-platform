import "server-only";

import { alertTypeLabel } from "@/lib/alert-labels";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

/**
 * Email the business owners when an alert becomes high risk, so it is seen
 * without anyone having to open the Alerts page. Uses the platform's existing
 * Resend sender (same as the password-reset email); silently skips when email
 * is not configured. Reads the alert fresh, so an alert whose transaction was
 * rolled back is never announced.
 */
export async function sendHighRiskAlertEmail(alertId: number) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.PASSWORD_RESET_FROM_EMAIL;
  if (!apiKey || !fromEmail) return { delivered: false as const, reason: "email_not_configured" };

  const alert = await prisma.activityAlert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      alertType: true,
      severity: true,
      riskScore: true,
      description: true,
      occurrenceCount: true,
      status: true,
      business: { select: { name: true } },
      businessId: true,
    },
  });
  if (!alert || alert.status === "RESOLVED" || alert.status === "DISMISSED") return { delivered: false as const, reason: "no_open_alert" };

  const owners = await prisma.user.findMany({
    where: { businessId: alert.businessId, role: "BUSINESS_OWNER", status: "ACTIVE" },
    select: { email: true },
  });
  const to = owners.map((owner) => owner.email).filter(Boolean);
  if (to.length === 0) return { delivered: false as const, reason: "no_owner_email" };

  const appUrl = (getConfiguredAppUrl() ?? "https://www.loyaltycarduae.com").replace(/\/+$/, "");
  const link = `${appUrl}/dashboard/notifications/${alert.id}`;
  const title = alertTypeLabel(alert.alertType);
  const subject = `${alert.severity === "CRITICAL" ? "Critical" : "High-risk"} alert: ${title} - ${alert.business.name}`;
  const repeats = alert.occurrenceCount > 1 ? ` It has happened ${alert.occurrenceCount} times.` : "";
  const text = `${title}\n\n${alert.description}${repeats}\nRisk score: ${alert.riskScore}/100.\n\nReview it: ${link}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0F172A;max-width:560px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#B91C1C">${escapeHtml(alert.severity)} risk alert</p>
      <h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(title)}</h1>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6">${escapeHtml(alert.description)}${escapeHtml(repeats)}</p>
      <p style="margin:0 0 20px;font-size:13px;color:#475569">Risk score: <strong>${alert.riskScore}/100</strong> &middot; ${escapeHtml(alert.business.name)}</p>
      <a href="${link}" style="display:inline-block;background:#0F172A;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px">Review the alert</a>
      <p style="margin:20px 0 0;font-size:12px;color:#94A3B8">You get this email for high-risk alerts only. Change alert rules in Settings &rarr; Loyalty rules &rarr; Alert policies.</p>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to, subject, text, html }),
  });
  if (!response.ok) throw new Error(`Alert email provider failed with ${response.status}.`);
  return { delivered: true as const };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
