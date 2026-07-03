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
  expireStaleSupportRequests,
  expireStaleSupportSessions,
  setSupportSessionCookie,
  SUPPORT_REQUEST_EXPIRY_MINUTES,
  SUPPORT_SESSION_DURATIONS,
} from "@/lib/support-sessions";

const scope = "platform:support-sessions";

const startSupportSessionSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  businessUuid: z.string().trim().min(1),
  reason: z.string().trim().min(1, "Reason for access is required."),
  durationMinutes: z.coerce.number().refine((value) => SUPPORT_SESSION_DURATIONS.includes(value as 15 | 30 | 60), "Duration is required."),
  readOnly: z.boolean().default(true),
  emergency: z.boolean().default(false),
  activeRedirectTo: z.string().trim().optional(),
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

const supportRequestDecisionSchema = z.object({
  supportRequestId: z.coerce.number().int().positive(),
  responseNote: z.string().trim().optional(),
  redirectTo: z.string().trim().optional(),
});

const supportAccessPolicySchema = z.object({
  supportAccessPolicy: z.enum(["IMMEDIATE", "APPROVAL_REQUIRED", "EMERGENCY_ACCESS"]),
  redirectTo: z.string().trim().optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function getSafeRedirectPath(value: string, fallback: string) {
  return value.startsWith("/platform") || value.startsWith("/dashboard") ? value : fallback;
}

function formatSupportDuration(startedAt: Date, endedAt: Date) {
  const totalMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
  if (totalMinutes < 60) {
    return totalMinutes + " min";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? hours + " hr " + minutes + " min" : hours + " hr";
}

function validateSecurity(formData: FormData, path: string) {
  try {
    validateCsrfForm(formData, scope);
  } catch {
    fail(path, "Security check failed. Please refresh and try again.");
  }
}

async function createSupportSessionFromRequest({
  businessId,
  adminUserId,
  reason,
  durationMinutes,
  readOnly,
  supportRequestId,
  now = new Date(),
}: {
  businessId: number;
  adminUserId: number;
  reason: string;
  durationMinutes: number;
  readOnly: boolean;
  supportRequestId?: number;
  now?: Date;
}) {
  const session = await prisma.supportSession.create({
    data: {
      businessId,
      adminUserId,
      reason,
      startedAt: now,
      // Equivalent immediate-session expiry: expiresAt: new Date(now.getTime() + data.durationMinutes * 60 * 1000)
      expiresAt: new Date(now.getTime() + durationMinutes * 60 * 1000),
      readOnly,
      status: "ACTIVE",
      supportRequestId,
    },
  });

  await recordSupportActivity({
    supportSessionId: session.id,
    adminUserId,
    businessId,
    activityType: "SESSION_STARTED",
    path: "/dashboard",
    description: supportRequestId ? "Support session started after Business Owner approval" : "Support session started",
  });

  return session;
}

export async function startSupportSessionAction(formData: FormData) {
  const businessUuid = getString(formData, "businessUuid");
  const defaultPath = businessUuid ? `/platform/businesses/${businessUuid}/support-session` : "/platform/businesses";
  const path = getSafeRedirectPath(getString(formData, "formPath"), defaultPath);
  const activeRedirectTo = getSafeRedirectPath(getString(formData, "activeRedirectTo"), defaultPath);
  validateSecurity(formData, path);
  const adminUser = await requireRole("PLATFORM_OWNER");

  const parsed = startSupportSessionSchema.safeParse({
    businessId: getString(formData, "businessId"),
    businessUuid,
    reason: getString(formData, "reason"),
    durationMinutes: getString(formData, "durationMinutes"),
    readOnly: formData.has("readOnly"),
    emergency: formData.has("emergency"),
    activeRedirectTo,
  });

  if (!parsed.success) {
    fail(path, parsed.error.issues[0]?.message ?? "Support session details are required.");
  }

  const data = parsed.data;
  const business = await prisma.business.findFirst({
    where: { id: data.businessId, uuid: data.businessUuid },
    select: { id: true, uuid: true, name: true, status: true, supportAccessPolicy: true },
  });

  if (!business) {
    fail("/platform/businesses", "Business not found.");
  }

  if (business.status === "ARCHIVED") {
    fail(`/platform/businesses/${business.uuid}`, "Support sessions cannot be started for archived businesses.");
  }

  await Promise.all([expireStaleSupportSessions(), expireStaleSupportRequests()]);

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
    const separator = activeRedirectTo.includes("?") ? "&" : "?";
    redirect(`${activeRedirectTo}${separator}businessId=${business.id}&activeSessionId=${activeSession.id}`);
  }

  const startsImmediately = business.supportAccessPolicy === "IMMEDIATE" || (business.supportAccessPolicy === "EMERGENCY_ACCESS" && data.emergency);

  if (!startsImmediately) {
    const request = await prisma.supportRequest.create({
      data: {
        businessId: business.id,
        requestedByUserId: adminUser.id,
        reason: data.reason,
        durationMinutes: data.durationMinutes,
        readOnly: data.readOnly,
        emergency: data.emergency,
        status: "PENDING",
        expiresAt: new Date(now.getTime() + SUPPORT_REQUEST_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await prisma.businessNotification.create({
      data: {
        businessId: business.id,
        title: data.emergency ? "Emergency Support Access Requested" : "Support Access Requested",
        message: "Loyalty Card UAE Support requested access to your workspace.",
        metadata: {
          reason: data.reason,
          durationMinutes: data.durationMinutes,
          readOnly: data.readOnly,
          emergency: data.emergency,
          expiresAt: request.expiresAt.toISOString(),
        },
      },
    });

    revalidatePath("/platform/operations-center");
    revalidatePath("/dashboard/support-history");
    revalidatePath("/dashboard");
    redirect(`${path}?success=${encodeURIComponent("Support request submitted for Business Owner approval.")}`);
  }

  const session = await createSupportSessionFromRequest({
    businessId: business.id,
    adminUserId: adminUser.id,
    reason: data.reason,
    durationMinutes: data.durationMinutes,
    readOnly: data.readOnly,
    now,
  });

  if (data.emergency) {
    await prisma.businessNotification.create({
      data: {
        businessId: business.id,
        title: "Emergency Support Access Started",
        message: "Loyalty Card UAE Support started emergency access to your workspace.",
        metadata: {
          reason: data.reason,
          durationMinutes: data.durationMinutes,
          readOnly: data.readOnly,
          startedAt: now.toISOString(),
        },
      },
    });
  }

  await setSupportSessionCookie(session.id);
  revalidatePath(`/platform/businesses/${business.uuid}`);
  revalidatePath("/platform/operations-center");
  redirect(`/dashboard?supportSessionId=${session.id}`);
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
  redirect(`/dashboard?supportSessionId=${session.id}`);
}

export async function approveSupportRequestAction(formData: FormData) {
  const redirectTo = getSafeRedirectPath(getString(formData, "redirectTo"), "/dashboard/support-history");
  validateSecurity(formData, redirectTo);
  const owner = await requireRole("BUSINESS_OWNER");
  if (!owner.businessId) {
    fail(redirectTo, "Business context is required.");
  }

  const parsed = supportRequestDecisionSchema.safeParse({
    supportRequestId: getString(formData, "supportRequestId"),
    responseNote: getString(formData, "responseNote"),
    redirectTo,
  });

  if (!parsed.success) {
    fail(redirectTo, "Support request is not available.");
  }

  await expireStaleSupportRequests();
  const now = new Date();
  const request = await prisma.supportRequest.findFirst({
    where: {
      id: parsed.data.supportRequestId,
      businessId: owner.businessId,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    select: { id: true, businessId: true, requestedByUserId: true, reason: true, durationMinutes: true, readOnly: true },
  });

  if (!request) {
    fail(redirectTo, "Support request has expired or is no longer pending.");
  }

  await createSupportSessionFromRequest({
    businessId: request.businessId,
    adminUserId: request.requestedByUserId,
    reason: request.reason,
    durationMinutes: request.durationMinutes,
    readOnly: request.readOnly,
    supportRequestId: request.id,
    now,
  });

  await prisma.supportRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      reviewedByUserId: owner.id,
      reviewedAt: now,
      responseNote: parsed.data.responseNote || null,
    },
  });

  revalidatePath("/dashboard/support-history");
  revalidatePath("/platform/operations-center");
  redirect(`${redirectTo}?success=${encodeURIComponent("Support request approved. Loyalty Card UAE Support can now join the session.")}`);
}

export async function rejectSupportRequestAction(formData: FormData) {
  const redirectTo = getSafeRedirectPath(getString(formData, "redirectTo"), "/dashboard/support-history");
  validateSecurity(formData, redirectTo);
  const owner = await requireRole("BUSINESS_OWNER");
  if (!owner.businessId) {
    fail(redirectTo, "Business context is required.");
  }

  const parsed = supportRequestDecisionSchema.safeParse({
    supportRequestId: getString(formData, "supportRequestId"),
    responseNote: getString(formData, "responseNote"),
    redirectTo,
  });

  if (!parsed.success) {
    fail(redirectTo, "Support request is not available.");
  }

  await expireStaleSupportRequests();
  const updated = await prisma.supportRequest.updateMany({
    where: {
      id: parsed.data.supportRequestId,
      businessId: owner.businessId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    data: {
      status: "REJECTED",
      reviewedByUserId: owner.id,
      reviewedAt: new Date(),
      responseNote: parsed.data.responseNote || null,
    },
  });

  if (updated.count === 0) {
    fail(redirectTo, "Support request has expired or is no longer pending.");
  }

  revalidatePath("/dashboard/support-history");
  revalidatePath("/platform/operations-center");
  redirect(`${redirectTo}?success=${encodeURIComponent("Support request rejected.")}`);
}

export async function saveSupportAccessPolicyAction(formData: FormData) {
  const redirectTo = getSafeRedirectPath(getString(formData, "redirectTo"), "/dashboard/settings?tab=support");
  validateSecurity(formData, redirectTo);
  const owner = await requireRole("BUSINESS_OWNER");
  if (!owner.businessId) {
    fail(redirectTo, "Business context is required.");
  }

  const parsed = supportAccessPolicySchema.safeParse({
    supportAccessPolicy: getString(formData, "supportAccessPolicy"),
    redirectTo,
  });

  if (!parsed.success) {
    fail(redirectTo, "Support access policy is required.");
  }

  await prisma.business.update({
    where: { id: owner.businessId },
    data: { supportAccessPolicy: parsed.data.supportAccessPolicy },
  });

  revalidatePath("/dashboard/settings");
  redirect(`${redirectTo}?success=${encodeURIComponent("Support access policy saved.")}`);
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
    select: { id: true, businessId: true, reason: true, startedAt: true },
  });
  const endedAt = new Date();

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
      endedAt,
      status: "ENDED",
      supportSummary: parsed.data.supportSummary,
    },
  });

  if (session) {
    await prisma.businessNotification.create({
      data: {
        businessId: session.businessId,
        title: "Support Access Completed",
        message: "Loyalty Card UAE Support accessed your workspace.",
        metadata: {
          date: endedAt.toISOString(),
          duration: formatSupportDuration(session.startedAt, endedAt),
          reason: session.reason,
          supportSummary: parsed.data.supportSummary,
        },
      },
    });
  }

  await clearSupportSessionCookie();
  revalidatePath(`/platform/businesses/${parsed.data.businessUuid}`);
  revalidatePath("/platform/operations-center");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/support-history");
  redirect(`${redirectTo}?success=Support%20session%20ended.`);
}



