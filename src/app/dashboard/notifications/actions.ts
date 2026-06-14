"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAlertLifecycleEvent } from "@/lib/alert-engine";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { roleHomePath } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

const reviewAlertSchema = z.object({
  alertId: z.coerce.number().int().positive("Alert not found."),
  status: z.enum(["ASSIGNED", "UNDER_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED", "OPEN"]),
  reviewNote: z.string().trim().optional(),
  assignedToUserId: z.coerce.number().int().positive().optional(),
  escalationReason: z.string().trim().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(message: string): never {
  redirect(`/dashboard/notifications?error=${encodeURIComponent(message)}`);
}

export async function reviewActivityAlertAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "dashboard:notifications");
  } catch {
    fail("Security check failed. Please refresh and try again.");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["BUSINESS_OWNER", "BRANCH_MANAGER"].includes(user.role)) redirect(roleHomePath[user.role]);
  if (!user.businessId) redirect(roleHomePath[user.role]);
  const parsed = reviewAlertSchema.safeParse({
    alertId: getString(formData, "alertId"),
    status: getString(formData, "status"),
    reviewNote: getString(formData, "reviewNote"),
    assignedToUserId: getString(formData, "assignedToUserId") || undefined,
    escalationReason: getString(formData, "escalationReason"),
    priority: getString(formData, "priority") || undefined,
  });

  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Validation failed.");

  const alert = await prisma.activityAlert.findFirst({
    where: {
      id: parsed.data.alertId,
      businessId: user.businessId,
      ...(user.role === "BRANCH_MANAGER" ? { branchId: user.branchId ?? -1 } : {}),
    },
    select: { id: true, branchId: true },
  });

  if (!alert) fail("Alert not found.");

  const now = new Date();
  const assignedUser = parsed.data.assignedToUserId
    ? await prisma.user.findFirst({
        where: {
          id: parsed.data.assignedToUserId,
          businessId: user.businessId,
          ...(user.role === "BRANCH_MANAGER" ? { branchId: user.branchId ?? -1 } : {}),
        },
        select: { id: true },
      })
    : null;
  if (parsed.data.assignedToUserId && !assignedUser) fail("Assigned user not found.");

  const updateData =
    parsed.data.status === "ASSIGNED"
      ? {
          status: "ASSIGNED" as const,
          assignedToUserId: assignedUser?.id ?? user.id,
          assignedAt: now,
          reviewNote: parsed.data.reviewNote || null,
          ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
        }
      : parsed.data.status === "UNDER_REVIEW"
        ? {
            status: "UNDER_REVIEW" as const,
            reviewNote: parsed.data.reviewNote || null,
            ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
          }
        : parsed.data.status === "RESOLVED"
          ? {
              status: "RESOLVED" as const,
              resolvedAt: now,
              resolvedByUserId: user.id,
              reviewedAt: now,
              reviewedBy: user.id,
              reviewNote: parsed.data.reviewNote || null,
              ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
            }
          : parsed.data.status === "DISMISSED"
            ? {
                status: "DISMISSED" as const,
                dismissedAt: now,
                dismissedByUserId: user.id,
                reviewedAt: now,
                reviewedBy: user.id,
                reviewNote: parsed.data.reviewNote || null,
                ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
              }
            : parsed.data.status === "ESCALATED"
              ? {
                  status: "ESCALATED" as const,
                  escalatedAt: now,
                  escalationReason: parsed.data.escalationReason || parsed.data.reviewNote || "Manual escalation",
                  reviewNote: parsed.data.reviewNote || null,
                  priority: parsed.data.priority ?? "CRITICAL" as const,
                }
              : {
                  status: "OPEN" as const,
                  reviewNote: parsed.data.reviewNote || null,
                  ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
                };

  await prisma.activityAlert.update({
    where: { id: alert.id },
    data: updateData,
  });
  const eventType =
    parsed.data.status === "ASSIGNED"
      ? "ALERT_ASSIGNED"
      : parsed.data.status === "ESCALATED"
        ? "ALERT_ESCALATED"
        : parsed.data.status === "RESOLVED"
          ? "ALERT_RESOLVED"
          : parsed.data.status === "DISMISSED"
            ? "ALERT_DISMISSED"
            : parsed.data.status === "OPEN"
              ? "ALERT_REOPENED"
              : "ALERT_UPDATED";

  await recordAlertLifecycleEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    alertId: alert.id,
    eventType,
    metadata: {
      status: parsed.data.status,
      reviewNote: parsed.data.reviewNote || null,
      priority: parsed.data.priority ?? null,
      assignedToUserId: assignedUser?.id ?? null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?success=Alert updated.");
}
