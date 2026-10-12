import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { DEFAULT_PLAN_LIMITS, STAFF_LIMIT_ROLES } from "@/lib/plan-limits";
import { CITY_JUMP_MINUTES, evaluatePlanCompliance, type ComplianceFacts, type ComplianceStatus } from "@/lib/plan-compliance-rules";
import { commerciallyUsableStatuses } from "@/lib/subscriptions";

export type BusinessCompliance = ComplianceFacts & {
  businessId: number;
  planName: string | null;
  status: ComplianceStatus;
  score: number;
  issues: string[];
};

export type PlanComplianceSummary = {
  status: ComplianceStatus;
  score: number;
  detectionCount: number;
  lastDetectedIssue: string | null;
  issues: string[];
  facts: BusinessCompliance;
};

const WINDOW_DAYS = 30;

/**
 * Plan compliance for many businesses at once (the System Administrator's
 * list) or one (the owner dashboard). Every query is grouped by the database,
 * so the cost does not grow with the amount of activity.
 */
export async function getPlanCompliance(businessIds?: number[]): Promise<Map<number, BusinessCompliance>> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const scope = businessIds ? { businessId: { in: businessIds } } : {};
  const jumpScope = businessIds ? Prisma.sql`AND "business_id" = ANY(${businessIds})` : Prisma.empty;

  const [subscriptions, branchGroups, staffRows, stampGroups, scanGroups, joinGroups, redemptionGroups, deviceGroups, cityGroups, jumpRows] =
    await Promise.all([
      prisma.businessSubscription.findMany({
        where: { ...scope, status: { in: commerciallyUsableStatuses } },
        orderBy: { createdAt: "desc" },
        select: { businessId: true, subscriptionPlan: { select: { name: true, maxBranches: true, maxStaff: true } } },
      }),
      prisma.branch.groupBy({ by: ["businessId"], where: scope, _count: { _all: true } }),
      prisma.user.findMany({
        where: { businessId: businessIds ? { in: businessIds } : { not: null }, role: { in: [...STAFF_LIMIT_ROLES] }, status: "ACTIVE" },
        select: { businessId: true, branchId: true },
      }),
      prisma.stampTransaction.groupBy({ by: ["businessId", "branchId"], where: { ...scope, createdAt: { gte: since }, branchId: { not: null } } }),
      prisma.scanEvent.groupBy({ by: ["businessId", "branchId"], where: { ...scope, createdAt: { gte: since }, branchId: { not: null } } }),
      prisma.businessCustomerMembership.groupBy({
        by: ["businessId", "createdBranchId"],
        where: { ...scope, createdAt: { gte: since }, createdBranchId: { not: null } },
      }),
      prisma.rewardRedemption.groupBy({ by: ["businessId", "branchId"], where: { ...scope, redeemedAt: { gte: since }, branchId: { not: null } } }),
      prisma.scanEvent.groupBy({ by: ["businessId", "deviceId"], where: { ...scope, createdAt: { gte: since }, deviceId: { not: null } } }),
      prisma.scanEvent.groupBy({ by: ["businessId", "ipCity"], where: { ...scope, createdAt: { gte: since }, ipCity: { not: null } } }),
      // Consecutive scans of the same branch (or of the owner, who has none)
      // from different cities, close together in time.
      prisma.$queryRaw<Array<{ business_id: number; jumps: number }>>`
        SELECT "business_id", COUNT(*)::int AS "jumps"
        FROM (
          SELECT "business_id", "ip_city", "created_at",
            LAG("ip_city") OVER w AS "prev_city",
            LAG("created_at") OVER w AS "prev_at"
          FROM "scan_events"
          WHERE "created_at" >= ${since} AND "ip_city" IS NOT NULL ${jumpScope}
          WINDOW w AS (PARTITION BY "business_id", COALESCE("branch_id", -1) ORDER BY "created_at")
        ) AS "s"
        WHERE "prev_city" IS NOT NULL AND "ip_city" <> "prev_city"
          AND "created_at" - "prev_at" <= ${`${CITY_JUMP_MINUTES} minutes`}::interval
        GROUP BY "business_id"`,
    ]);

  const ids = new Set<number>(businessIds ?? []);
  const bucket = <T,>(map: Map<number, T>, id: number, create: () => T) => {
    ids.add(id);
    if (!map.has(id)) map.set(id, create());
    return map.get(id)!;
  };

  const plans = new Map<number, (typeof subscriptions)[number]["subscriptionPlan"]>();
  for (const row of subscriptions) if (!plans.has(row.businessId)) plans.set(row.businessId, row.subscriptionPlan);
  const branchCounts = new Map(branchGroups.map((group) => [group.businessId, group._count._all]));
  for (const id of branchCounts.keys()) ids.add(id);

  const staff = new Map<number, { count: number; branches: Set<number>; missing: number }>();
  for (const row of staffRows) {
    if (row.businessId === null) continue;
    const entry = bucket(staff, row.businessId, () => ({ count: 0, branches: new Set<number>(), missing: 0 }));
    entry.count += 1;
    if (row.branchId) entry.branches.add(row.branchId);
    else entry.missing += 1;
  }

  const activity = new Map<number, Set<number>>();
  for (const row of [...stampGroups, ...scanGroups, ...redemptionGroups]) {
    if (row.branchId) bucket(activity, row.businessId, () => new Set<number>()).add(row.branchId);
  }
  for (const row of joinGroups) {
    if (row.createdBranchId) bucket(activity, row.businessId, () => new Set<number>()).add(row.createdBranchId);
  }

  const devices = new Map<number, number>();
  for (const row of deviceGroups) devices.set(row.businessId, (devices.get(row.businessId) ?? 0) + 1);
  const cities = new Map<number, string[]>();
  for (const row of cityGroups) if (row.ipCity) bucket(cities, row.businessId, () => [] as string[]).push(row.ipCity);
  const jumps = new Map(jumpRows.map((row) => [Number(row.business_id), Number(row.jumps)]));

  const result = new Map<number, BusinessCompliance>();
  for (const businessId of ids) {
    const plan = plans.get(businessId);
    const staffEntry = staff.get(businessId);
    const facts: ComplianceFacts = {
      maxBranches: plan?.maxBranches ?? DEFAULT_PLAN_LIMITS.maxBranches,
      maxStaff: plan?.maxStaff ?? DEFAULT_PLAN_LIMITS.maxStaff,
      branchCount: branchCounts.get(businessId) ?? 0,
      activeStaffCount: staffEntry?.count ?? 0,
      activityBranchCount: activity.get(businessId)?.size ?? 0,
      assignedBranchCount: staffEntry?.branches.size ?? 0,
      missingAssignmentCount: staffEntry?.missing ?? 0,
      scannerDeviceCount: devices.get(businessId) ?? 0,
      scanCities: (cities.get(businessId) ?? []).sort((a, b) => a.localeCompare(b)),
      cityJumps: jumps.get(businessId) ?? 0,
    };
    result.set(businessId, { businessId, planName: plan?.name ?? null, ...facts, ...evaluatePlanCompliance(facts) });
  }
  return result;
}

/** One business's plan check, for its owner dashboard. */
export async function getPlanComplianceSummary({
  businessId,
  recordAuditEvent = false,
}: {
  businessId: number;
  planCode?: string | null;
  recordAuditEvent?: boolean;
}): Promise<PlanComplianceSummary> {
  const facts = (await getPlanCompliance([businessId])).get(businessId)!;
  const summary: PlanComplianceSummary = {
    status: facts.status,
    score: facts.score,
    detectionCount: facts.issues.length,
    lastDetectedIssue: facts.issues[0] ?? null,
    issues: facts.issues,
    facts,
  };

  if (recordAuditEvent && summary.status !== "COMPLIANT") {
    await recordComplianceAuditEvent(businessId, facts);
  }

  return summary;
}

async function recordComplianceAuditEvent(businessId: number, facts: BusinessCompliance) {
  const recent = await prisma.auditEvent.findFirst({
    where: {
      businessId,
      action: "POSSIBLE_MULTI_BRANCH_USAGE",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  if (recent) return;

  await logAuditEvent({
    businessId,
    action: "POSSIBLE_MULTI_BRANCH_USAGE",
    entityType: "plan_compliance",
    entityId: businessId,
    metadata: {
      severity: facts.status === "OVER_LIMIT" ? "HIGH" : "MEDIUM",
      status: "warning",
      complianceStatus: facts.status,
      planName: facts.planName,
      complianceScore: facts.score,
      issues: facts.issues,
      branchCount: facts.branchCount,
      activeStaffCount: facts.activeStaffCount,
      activityBranchCount: facts.activityBranchCount,
      scannerDeviceCount: facts.scannerDeviceCount,
      scanCities: facts.scanCities,
      cityJumps: facts.cityJumps,
      detectedAt: new Date().toISOString(),
    },
  });
}
