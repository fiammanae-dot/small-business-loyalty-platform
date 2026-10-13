import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getConfiguredAppUrl } from "@/lib/app-url";

/**
 * "Request Demo" submissions from the public website: saved, then emailed to
 * the sales inbox so nobody has to remember to check the admin page.
 */
export const DEMO_REQUEST_BUSINESS_TYPES = ["Coffee Shop", "Restaurant", "Salon / Barber", "Clinic / Aesthetic", "Gym", "Retail Store", "Car Care", "Perfume / Oud", "Service Business", "Other"] as const;
export const DEMO_REQUEST_COUNTRIES = ["United Arab Emirates", "Saudi Arabia", "Kuwait", "Qatar", "Bahrain", "Oman", "Jordan", "Egypt", "Other"] as const;

/** Where new requests are emailed. Falls back to the sender address so nothing is lost when unset. */
export const DEMO_REQUEST_INBOX_FALLBACK = "admin@loyaltycarduae.com";

export const demoRequestSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name.").max(120),
  contactName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .max(30)
    .regex(/^[+\d][\d\s().-]*$/, "Enter a valid phone number."),
  country: z.enum(DEMO_REQUEST_COUNTRIES, { message: "Choose your country." }),
  businessType: z.enum(DEMO_REQUEST_BUSINESS_TYPES, { message: "Choose your business type." }),
  branches: z.coerce.number().int().min(1, "Enter at least 1 branch.").max(500, "Enter up to 500 branches."),
  message: z.string().trim().max(2000, "Keep the message under 2,000 characters.").optional().or(z.literal("")),
  /** Honeypot: humans never see this field, so anything in it is a bot. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

export function demoRequestInbox() {
  return process.env.DEMO_REQUEST_EMAIL?.trim() || DEMO_REQUEST_INBOX_FALLBACK;
}

/** Emails the request to the sales inbox. Never throws: a mail failure must not lose the lead, which is already saved. */
export async function sendDemoRequestEmail(requestId: number) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.PASSWORD_RESET_FROM_EMAIL;
  if (!apiKey || !fromEmail) return { delivered: false as const, reason: "email_not_configured" };

  const request = await prisma.demoRequest.findUnique({ where: { id: requestId } });
  if (!request) return { delivered: false as const, reason: "not_found" };

  const appUrl = (getConfiguredAppUrl() ?? "https://www.loyaltycarduae.com").replace(/\/+$/, "");
  const link = `${appUrl}/platform/demo-requests`;
  const subject = `Demo request: ${request.businessName} (${request.businessType}, ${request.country})`;
  const rows: Array<[string, string]> = [
    ["Business", request.businessName],
    ["Contact", request.contactName],
    ["Email", request.email],
    ["Phone", request.phone],
    ["Country", request.country],
    ["Business type", request.businessType],
    ["Branches", String(request.branches)],
    ["Message", request.message?.trim() || "(none)"],
  ];
  const text = `New demo request\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nAll requests: ${link}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0F172A;max-width:560px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#C2410C">New demo request</p>
      <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(request.businessName)}</h1>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.5">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:4px 16px 4px 0;color:#64748B;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="margin:20px 0 0"><a href="${link}" style="display:inline-block;background:#141210;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px">Open demo requests</a></p>
      <p style="margin:20px 0 0;font-size:12px;color:#94A3B8">Reply to this email to answer ${escapeHtml(request.contactName)} directly.</p>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [demoRequestInbox()], reply_to: request.email, subject, text, html }),
    });
    if (!response.ok) {
      console.warn(`[demo-request] email provider failed with ${response.status}`);
      return { delivered: false as const, reason: "provider_failed" };
    }
    await prisma.demoRequest.update({ where: { id: requestId }, data: { emailedAt: new Date() } });
    return { delivered: true as const };
  } catch (error) {
    console.warn("[demo-request] email failed", error);
    return { delivered: false as const, reason: "provider_failed" };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
