import "server-only";

import type { Prisma } from "@prisma/client";
import { commerciallyUsableStatuses } from "@/lib/subscriptions";
import { prisma } from "@/lib/prisma";

/** What a business's current plan allows. Without a usable plan: the Starter limits. */
export type BusinessPlanLimits = {
  planCode: string | null;
  planName: string | null;
  maxBranches: number;
  maxStaff: number;
  maxPrograms: number;
};

export const DEFAULT_PLAN_LIMITS = { maxBranches: 1, maxStaff: 3, maxPrograms: 1 } as const;

/** The roles that count toward the staff limit (the owner never does). */
export const STAFF_LIMIT_ROLES = ["STAFF", "BRANCH_MANAGER"] as const;

type Db = Prisma.TransactionClient | typeof prisma;

export async function getBusinessPlanLimits(businessId: number, db: Db = prisma): Promise<BusinessPlanLimits> {
  const subscription = await db.businessSubscription.findFirst({
    where: { businessId, status: { in: commerciallyUsableStatuses } },
    orderBy: { createdAt: "desc" },
    select: { subscriptionPlan: { select: { code: true, name: true, maxBranches: true, maxStaff: true, maxLoyaltyPrograms: true } } },
  });
  const plan = subscription?.subscriptionPlan;
  return {
    planCode: plan?.code ?? null,
    planName: plan?.name ?? null,
    maxBranches: plan?.maxBranches ?? DEFAULT_PLAN_LIMITS.maxBranches,
    maxStaff: plan?.maxStaff ?? DEFAULT_PLAN_LIMITS.maxStaff,
    maxPrograms: plan?.maxLoyaltyPrograms ?? DEFAULT_PLAN_LIMITS.maxPrograms,
  };
}

export function countActiveStaff(businessId: number, db: Db = prisma) {
  return db.user.count({ where: { businessId, role: { in: [...STAFF_LIMIT_ROLES] }, status: "ACTIVE" } });
}

const LIMIT_LOCK = { branch: 7101, staff: 7102 } as const;

/**
 * Serialises "count, then add" for one business inside a transaction, so two
 * quick submissions cannot both pass the limit check (the lock is released when
 * the transaction ends).
 */
export async function lockBusinessLimit(tx: Prisma.TransactionClient, businessId: number, kind: keyof typeof LIMIT_LOCK) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LIMIT_LOCK[kind]}::int, ${businessId}::int)`;
}
