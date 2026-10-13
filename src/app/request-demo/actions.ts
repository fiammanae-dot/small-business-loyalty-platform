"use server";

import { demoRequestSchema, sendDemoRequestEmail } from "@/lib/demo-requests";
import { prisma } from "@/lib/prisma";
import { isPublicActionRateLimited, recordPublicActionAttempt } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";

export type DemoRequestState = { ok: true } | { ok: false; error: string; field?: string };

/**
 * Saves a "Request Demo" submission and emails it to the sales inbox. The save
 * comes first: if email is down the lead is still on /platform/demo-requests.
 */
export async function submitDemoRequestAction(_previous: DemoRequestState | null, formData: FormData): Promise<DemoRequestState> {
  const parsed = demoRequestSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    businessType: formData.get("businessType"),
    branches: formData.get("branches"),
    message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // A filled honeypot is a bot: pretend it worked and keep nothing.
    if (issue?.path[0] === "website") return { ok: true };
    return { ok: false, error: issue?.message ?? "Please check the form and try again.", field: String(issue?.path[0] ?? "") };
  }

  const { ipAddress } = await getRequestInfo();
  const scope = "public_demo_request" as const;
  if (await isPublicActionRateLimited({ scope, ipAddress, identifier: parsed.data.email, windowMinutes: 60, maxAttempts: 5 })) {
    await recordPublicActionAttempt({ scope, ipAddress, identifier: parsed.data.email, outcome: "RATE_LIMITED" });
    return { ok: false, error: "Too many requests from this connection. Please try again in an hour, or email us directly." };
  }

  const { website: _website, message, ...data } = parsed.data;
  const request = await prisma.demoRequest.create({
    data: { ...data, message: message?.trim() || null, ipAddress },
    select: { id: true },
  });
  await recordPublicActionAttempt({ scope, ipAddress, identifier: parsed.data.email, outcome: "SAVED" });
  await sendDemoRequestEmail(request.id);
  return { ok: true };
}
