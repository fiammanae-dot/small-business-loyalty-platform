import { commerciallyUsableStatuses } from "@/lib/subscriptions";

export const businessOwnerInclude = {
  branding: true,
  tierSetting: true,
  communicationSettings: true,
  scannerSettings: true,
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
} as const;
