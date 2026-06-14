import "server-only";

import { prisma } from "@/lib/prisma";
import { commerciallyUsableStatuses } from "@/lib/subscriptions";

export const SUBSCRIPTION_REQUIRED_MESSAGE =
  "Your subscription is not active. Please contact the system administrator to reactivate your account.";

export const BRANCH_INACTIVE_MESSAGE =
  "This branch is inactive. Please contact your business owner to reactivate branch access.";

export async function hasUsableSubscription(businessId: number) {
  const subscription = await prisma.businessSubscription.findFirst({
    where: { businessId, status: { in: commerciallyUsableStatuses } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  return Boolean(subscription);
}

export async function requireUsableSubscription(businessId: number) {
  const usable = await hasUsableSubscription(businessId);
  if (!usable) {
    throw new Error(SUBSCRIPTION_REQUIRED_MESSAGE);
  }
}

export async function requireActiveBranch(branchId: number, businessId: number) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!branch) {
    throw new Error(BRANCH_INACTIVE_MESSAGE);
  }
}
