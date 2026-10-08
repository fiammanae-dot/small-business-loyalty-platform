import type { BusinessSubscription, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const commerciallyUsableStatuses: SubscriptionStatus[] = ["TRIAL", "ACTIVE"];

export type SubscriptionWithPlan = BusinessSubscription & {
  subscriptionPlan: SubscriptionPlan;
};

export function getRemainingDays(date?: Date | null) {
  if (!date) return null;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getTrialRemainingDays(subscription?: Pick<BusinessSubscription, "trialEndDate"> | null) {
  return getRemainingDays(subscription?.trialEndDate);
}

export function getSubscriptionRemainingDays(subscription?: Pick<BusinessSubscription, "expiryDate" | "endDate"> | null) {
  return getRemainingDays(subscription?.expiryDate ?? subscription?.endDate);
}

export function isSubscriptionUsable(subscription?: Pick<BusinessSubscription, "status"> | null) {
  return !!subscription && commerciallyUsableStatuses.includes(subscription.status);
}

export function limitReachedMessage(kind: "branch" | "program", max: number) {
  const label = kind === "branch" ? "branch" : "loyalty program";
  return `Your current plan allows up to ${max} ${label}${max === 1 ? "" : "s"}. Upgrade your plan to add more.`;
}

/**
 * Cashback is a business-wide program that occupies one slot in a plan's
 * program limit, counted alongside each stamp/membership loyalty program.
 * Use this everywhere program usage is shown or enforced so the platform
 * counts cashback consistently.
 */
export function programsUsedTowardLimit(loyaltyProgramCount: number, cashbackEnabled: boolean) {
  return loyaltyProgramCount + (cashbackEnabled ? 1 : 0);
}

export function subscriptionDisplayDate(subscription?: Pick<BusinessSubscription, "expiryDate" | "endDate"> | null) {
  return subscription?.expiryDate ?? subscription?.endDate ?? null;
}
