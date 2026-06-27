import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { businessOwnerInclude } from "@/lib/business-context";
import { getActiveSupportSessionForCurrentAdmin } from "@/lib/support-sessions";
import { requireRole, type AuthUser } from "@/lib/session";

export { businessOwnerInclude } from "@/lib/business-context";

export async function requireBusinessOwner() {
  const user = await requireRole("BUSINESS_OWNER");

  if (!user.businessId) {
    redirect("/login");
  }

  return user as AuthUser & { businessId: number };
}

export async function getBusinessOwnerContext() {
  const supportContext = await getActiveSupportSessionForCurrentAdmin();
  if (supportContext) {
    return supportContext;
  }

  const user = await requireBusinessOwner();
  const business = await prisma.business.findFirst({
    where: { id: user.businessId },
    include: businessOwnerInclude,
  });

  if (!business) {
    redirect("/login");
  }

  return { user, business, supportSession: null };
}

export function getCurrentPlan(
  business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"],
) {
  return business.subscriptions[0]?.subscriptionPlan ?? null;
}

export function getCurrentSubscription(
  business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"],
) {
  return business.subscriptions[0] ?? null;
}
