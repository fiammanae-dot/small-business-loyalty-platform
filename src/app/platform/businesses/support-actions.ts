"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { recordSupportActivity } from "@/lib/support-activity";
import { requireRole } from "@/lib/session";
import {
  clearSupportSessionCookie,
  expireStaleSupportSessions,
  setSupportSessionCookie,
  SUPPORT_SESSION_DURATIONS,
} from "@/lib/support-sessions";

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
  supportSummary: z.string().trim().min(1, "Support summary is required."),
  redirectTo: z.string().trim().optional(),
});

const joinSupportSessionSchema = z.object({
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

function getSafeRedirectPath(value: string, fallback: string) {
  return value.startsWith("/platform") ? value : fallback;
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
  const activeSession = await prisma.supportSession.findFirst({
    where: {
      businessId: business.id,
      status: "ACTIVE",
      endedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (activeSession) {
    redirect(`/platform/businesses/${business.uuid}/support-session?activeSessionId=${activeSession.id}`);
  }

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

  await setSupportSessionCookie(session.id);
  await recordSupportActivity({
    supportSessionId: session.id,
    adminUserId: adminUser.id,
    businessId: business.id,
    activityType: "SESSION_STARTED",
    path: "/dashboard",
    description: "Support session started",
  });
  revalidatePath(`/platform/businesses/${business.uuid}`);
  redirect("/dashboard");
}

export async function joinSupportSessionAction(formData: FormData) {
  const businessUuid = getString(formData, "businessUuid");
  const path = businessUuid ? `/platform/businesses/${businessUuid}/support-session` : "/platform/businesses";
  validateSecurity(formData, path);
  const adminUser = await requireRole("PLATFORM_OWNER");

  const parsed = joinSupportSessionSchema.safeParse({
    supportSessionId: getString(formData, "supportSessionId"),
    businessUuid,
  });

  if (!parsed.success) {
    fail(path, "Support session is not available.");
  }

  await expireStaleSupportSessions();

  const session = await prisma.supportSession.findFirst({
    where: {
      id: parsed.data.supportSessionId,
      business: { uuid: parsed.data.businessUuid },
      status: "ACTIVE",
      endedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, businessId: true },
  });

  if (!session) {
    fail(path, "Support session has ended or expired.");
  }

  await setSupportSessionCookie(session.id);
  await recordSupportActivity({
    supportSessionId: session.id,
    adminUserId: adminUser.id,
    businessId: session.businessId,
    activityType: "SESSION_JOINED",
    path: "/dashboard",
    description: "Support session joined",
  });
  redirect("/dashboard");
}

export async function endSupportSessionAction(formData: FormData) {
  const redirectTo = getSafeRedirectPath(getString(formData, "redirectTo"), "/platform");
  validateSecurity(formData, redirectTo);
  const adminUser = await requireRole("PLATFORM_OWNER");
  const parsed = endSupportSessionSchema.safeParse({
    supportSessionId: getString(formData, "supportSessionId"),
    businessUuid: getString(formData, "businessUuid"),
    supportSummary: getString(formData, "supportSummary"),
    redirectTo,
  });

  if (!parsed.success) {
    fail(redirectTo, parsed.error.issues[0]?.message ?? "Support session is not available.");
  }

  const session = await prisma.supportSession.findFirst({
    where: {
      id: parsed.data.supportSessionId,
      status: "ACTIVE",
      endedAt: null,
    },
    select: { id: true, businessId: true },
  });

  if (session) {
    await recordSupportActivity({
      supportSessionId: session.id,
      adminUserId: adminUser.id,
      businessId: session.businessId,
      activityType: "SESSION_ENDED",
      path: "/platform",
      description: `Support session ended: ${parsed.data.supportSummary}`,
    });
  }

  await prisma.supportSession.updateMany({
    where: {
      id: parsed.data.supportSessionId,
      status: "ACTIVE",
      endedAt: null,
    },
    data: {
      endedAt: new Date(),
      status: "ENDED",
      supportSummary: parsed.data.supportSummary,
    },
  });

  await clearSupportSessionCookie();
  revalidatePath(`/platform/businesses/${parsed.data.businessUuid}`);
  revalidatePath("/platform/operations-center");
  redirect(`${redirectTo}?success=Support%20session%20ended.`);
}
