"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SubscriptionStatus } from "@prisma/client";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(message: string): never {
  redirect(`/platform/subscriptions?error=${encodeURIComponent(message)}`);
}

function validateSecurity(formData: FormData) {
  try {
    validateCsrfForm(formData, "platform:subscriptions");
  } catch {
    fail("Security check failed. Please refresh and try again.");
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function updateSubscriptionStatusAction(formData: FormData) {
  validateSecurity(formData);
  const user = await requireRole("PLATFORM_OWNER");
  const subscriptionId = Number(getString(formData, "subscriptionId"));
  const nextStatus = getString(formData, "nextStatus") as SubscriptionStatus;

  if (!subscriptionId || !["TRIAL", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"].includes(nextStatus)) {
    fail("Subscription action is invalid.");
  }

  const subscription = await prisma.businessSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, businessId: true, status: true },
  });
  if (!subscription) fail("Subscription not found.");

  await prisma.$transaction(async (tx) => {
    await tx.businessSubscription.update({
      where: { id: subscription.id },
      data: {
        status: nextStatus,
        endDate: ["CANCELLED", "EXPIRED"].includes(nextStatus) ? new Date() : null,
      },
    });

    await tx.subscriptionAuditLog.create({
      data: {
        businessId: subscription.businessId,
        businessSubscriptionId: subscription.id,
        userId: user.id,
        action: subscription.status === "TRIAL" && nextStatus === "EXPIRED" ? "TRIAL_EXPIRED" : "STATUS_CHANGED",
        previousValue: subscription.status,
        newValue: nextStatus,
      },
    });
  });

  revalidatePath("/platform/subscriptions");
  revalidatePath("/platform/businesses");
  redirect("/platform/subscriptions?success=Subscription updated.");
}

export async function extendSubscriptionAction(formData: FormData) {
  validateSecurity(formData);
  const user = await requireRole("PLATFORM_OWNER");
  const subscriptionId = Number(getString(formData, "subscriptionId"));
  const days = Number(getString(formData, "days") || "30");

  if (!subscriptionId || !Number.isInteger(days) || days < 1 || days > 3650) {
    fail("Extension days must be between 1 and 3650.");
  }

  const subscription = await prisma.businessSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, businessId: true, expiryDate: true, renewalDate: true, endDate: true },
  });
  if (!subscription) fail("Subscription not found.");

  const baseDate = subscription.expiryDate && subscription.expiryDate > new Date() ? subscription.expiryDate : new Date();
  const nextDate = addDays(baseDate, days);
  const previousValue = (subscription.expiryDate ?? subscription.endDate)?.toISOString() ?? "not set";

  await prisma.$transaction(async (tx) => {
    await tx.businessSubscription.update({
      where: { id: subscription.id },
      data: {
        expiryDate: nextDate,
        renewalDate: nextDate,
        endDate: null,
      },
    });

    await tx.subscriptionAuditLog.create({
      data: {
        businessId: subscription.businessId,
        businessSubscriptionId: subscription.id,
        userId: user.id,
        action: "SUBSCRIPTION_EXTENDED",
        previousValue,
        newValue: nextDate.toISOString(),
      },
    });
  });

  revalidatePath("/platform/subscriptions");
  redirect("/platform/subscriptions?success=Subscription extended.");
}

export async function startTrialAction(formData: FormData) {
  validateSecurity(formData);
  const user = await requireRole("PLATFORM_OWNER");
  const subscriptionId = Number(getString(formData, "subscriptionId"));
  const days = Number(getString(formData, "days") || "14");

  if (!subscriptionId || !Number.isInteger(days) || days < 1 || days > 365) {
    fail("Trial days must be between 1 and 365.");
  }

  const subscription = await prisma.businessSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, businessId: true, status: true, trialStartDate: true, trialEndDate: true },
  });
  if (!subscription) fail("Subscription not found.");

  const now = new Date();
  const trialEndDate = addDays(now, days);

  await prisma.$transaction(async (tx) => {
    await tx.businessSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "TRIAL",
        trialStartDate: now,
        trialEndDate,
        expiryDate: trialEndDate,
        renewalDate: trialEndDate,
        endDate: null,
      },
    });

    await tx.subscriptionAuditLog.create({
      data: {
        businessId: subscription.businessId,
        businessSubscriptionId: subscription.id,
        userId: user.id,
        action: "TRIAL_ACTIVATED",
        previousValue: `${subscription.status}:${subscription.trialStartDate?.toISOString() ?? "none"}:${subscription.trialEndDate?.toISOString() ?? "none"}`,
        newValue: `${now.toISOString()}:${trialEndDate.toISOString()}`,
      },
    });
  });

  revalidatePath("/platform/subscriptions");
  redirect("/platform/subscriptions?success=Trial activated.");
}
