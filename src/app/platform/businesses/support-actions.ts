"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { expireStaleSupportSessions, SUPPORT_SESSION_DURATIONS } from "@/lib/support-sessions";

const scope = "platform:support-sessions";

const startSupportSessionSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  businessUuid: z.string().trim().min(1),
  reason: z.string().trim().min(1, "Reason for access is required."),
  durationMinutes: z.coerce.number().refine((value) => SUPPORT_SESSION_DURATIONS.includes(value as 15 | 30 | 60), "Duration is required."),
  readOnly: z.boolean().default(true),
});

const endSupportSessionSchema = z.object({
  supportSessionId: z.coerce.number().int().positive(),
  businessUuid: z.string().trim().min(1),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function validateSecurity(formData: FormData, path: string) {
  try {
    validateCsrfForm(formData, scope);
  } catch {
    fail(path, "Security check failed. Please refresh and try again.");
  }
}

export async function startSupportSessionAction(formData: FormData) {
  const businessUuid = getString(formData, "businessUuid");
  const path = businessUuid ? `/platform/businesses/${businessUuid}/support-session` : "/platform/businesses";
  validateSecurity(formData, path);
  const adminUser = await requireRole("PLATFORM_OWNER");

  const parsed = startSupportSessionSchema.safeParse({
    businessId: getString(formData, "businessId"),
    businessUuid,
    reason: getString(formData, "reason"),
    durationMinutes: getString(formData, "durationMinutes"),
    readOnly: formData.has("readOnly"),
  });

  if (!parsed.success) {
    fail(path, parsed.error.issues[0]?.message ?? "Support session details are required.");
  }

  const data = parsed.data;
  const business = await prisma.business.findFirst({
    where: { id: data.businessId, uuid: data.businessUuid },
    select: { id: true, uuid: true, status: true },
  });

  if (!business) {
    fail("/platform/businesses", "Business not found.");
  }

  if (business.status === "ARCHIVED") {
    fail(`/platform/businesses/${business.uuid}`, "Support sessions cannot be started for archived businesses.");
  }

  await expireStaleSupportSessions();

  const now = new Date();
  const session = await prisma.supportSession.create({
    data: {
      businessId: business.id,
      adminUserId: adminUser.id,
      reason: data.reason,
      startedAt: now,
      expiresAt: new Date(now.getTime() + data.durationMinutes * 60 * 1000),
      readOnly: data.readOnly,
      status: "ACTIVE",
    },
  });

  revalidatePath(`/platform/businesses/${business.uuid}`);
  redirect(`/dashboard?supportSessionId=${session.id}`);
}

export async function endSupportSessionAction(formData: FormData) {
  validateSecurity(formData, "/platform/businesses");
  const adminUser = await requireRole("PLATFORM_OWNER");
  const parsed = endSupportSessionSchema.safeParse({
    supportSessionId: getString(formData, "supportSessionId"),
    businessUuid: getString(formData, "businessUuid"),
  });

  if (!parsed.success) {
    redirect("/platform/businesses?error=Support%20session%20is%20not%20available.");
  }

  await prisma.supportSession.updateMany({
    where: {
      id: parsed.data.supportSessionId,
      adminUserId: adminUser.id,
      status: "ACTIVE",
      endedAt: null,
    },
    data: {
      endedAt: new Date(),
      status: "ENDED",
    },
  });

  revalidatePath(`/platform/businesses/${parsed.data.businessUuid}`);
  redirect(`/platform/businesses/${parsed.data.businessUuid}?success=Support%20session%20ended.`);
}