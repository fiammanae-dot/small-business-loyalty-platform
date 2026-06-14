import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthUser } from "@/lib/session";
import { commerciallyUsableStatuses } from "@/lib/subscriptions";

export async function requireBusinessOwner() {
  const user = await requireRole("BUSINESS_OWNER");

  if (!user.businessId) {
    redirect("/login");
  }

  return user as AuthUser & { businessId: number };
}

export async function getBusinessOwnerContext() {
  const user = await requireBusinessOwner();
  const business = await prisma.business.findFirst({
    where: { id: user.businessId },
    include: {
      branding: true,
      communicationSettings: true,
      branches: { orderBy: { createdAt: "asc" } },
      users: {
        where: { role: { in: ["BRANCH_MANAGER", "STAFF"] } },
        orderBy: { createdAt: "desc" },
        include: { branch: true },
      },
      subscriptions: {
        where: { status: { in: commerciallyUsableStatuses } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { subscriptionPlan: true },
      },
      _count: {
        select: {
          branches: true,
          users: true,
          customerMemberships: true,
          loyaltyPrograms: true,
        },
      },
    },
  });

  if (!business) {
    redirect("/login");
  }

  return { user, business };
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
