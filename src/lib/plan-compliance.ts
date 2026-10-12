import "server-only";

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export type PlanComplianceSummary = {
  status: "COMPLIANT" | "POTENTIAL_MULTI_BRANCH";
  score: number;
  detectionCount: number;
  lastDetectedIssue: string | null;
  activityBranchCount: number;
  assignedBranchCount: number;
  missingAssignmentCount: number;
  activitySummary: string;
};

type PlanComplianceOptions = {
  businessId: number;
  planCode?: string | null;
  recordAuditEvent?: boolean;
};

export async function getPlanComplianceSummary({
  businessId,
  planCode,
  recordAuditEvent = false,
}: PlanComplianceOptions): Promise<PlanComplianceSummary> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Counts per branch, grouped by the database: the check only needs which
  // branches were active and how much happened, not every row of 30 days.
  const [branches, staffUsers, enrollmentGroups, stampGroups, redemptionGroups, scanGroups] = await Promise.all([
    prisma.branch.findMany({ where: { businessId }, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { businessId, role: { in: ["STAFF", "BRANCH_MANAGER"] }, status: "ACTIVE" },
      select: { id: true, role: true, branchId: true },
    }),
    prisma.businessCustomerMembership.groupBy({
      by: ["createdBranchId"],
      where: { businessId, createdAt: { gte: since }, createdBranchId: { not: null } },
      _count: { _all: true },
    }),
    prisma.stampTransaction.groupBy({
      by: ["branchId"],
      where: { businessId, createdAt: { gte: since }, branchId: { not: null } },
      _count: { _all: true },
    }),
    prisma.rewardRedemption.groupBy({
      by: ["branchId"],
      where: { businessId, redeemedAt: { gte: since }, branchId: { not: null } },
      _count: { _all: true },
    }),
    prisma.scanEvent.groupBy({
      by: ["branchId"],
      where: { businessId, createdAt: { gte: since }, branchId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const total = (groups: Array<{ _count: { _all: number } }>) => groups.reduce((sum, group) => sum + group._count._all, 0);
  const enrollments = { length: total(enrollmentGroups) };
  const stamps = { length: total(stampGroups) };
  const redemptions = { length: total(redemptionGroups) };
  const scans = { length: total(scanGroups) };

  const activityBranchIds = new Set<number>();
  for (const group of enrollmentGroups) if (group.createdBranchId) activityBranchIds.add(group.createdBranchId);
  for (const group of stampGroups) if (group.branchId) activityBranchIds.add(group.branchId);
  for (const group of redemptionGroups) if (group.branchId) activityBranchIds.add(group.branchId);
  for (const group of scanGroups) if (group.branchId) activityBranchIds.add(group.branchId);

  const assignedBranchIds = new Set<number>();
  let missingAssignmentCount = 0;
  for (const staffUser of staffUsers) {
    if (staffUser.branchId) assignedBranchIds.add(staffUser.branchId);
    else missingAssignmentCount += 1;
  }

  const isStarter = planCode === "STARTER";
  const issues: string[] = [];
  if (isStarter && branches.length > 1) issues.push("Starter business has more than one branch configured.");
  if (isStarter && activityBranchIds.size > 1) issues.push("Activity was recorded across multiple branches in the last 30 days.");
  if (isStarter && assignedBranchIds.size > 1) issues.push("Operational users are assigned across multiple branches.");
  if (missingAssignmentCount > 0) issues.push("Some Staff or Branch Manager users are missing branch assignment.");

  const detectionCount = issues.length;
  const score = Math.max(0, 100 - detectionCount * 25);
  const status = isStarter && detectionCount > 0 ? "POTENTIAL_MULTI_BRANCH" : "COMPLIANT";
  const activitySummary = [
    `${enrollments.length} enrollments`,
    `${stamps.length} stamp transactions`,
    `${redemptions.length} redemptions`,
    `${scans.length} scan events`,
    `${activityBranchIds.size} active branch pattern${activityBranchIds.size === 1 ? "" : "s"}`,
  ].join("; ");

  const summary: PlanComplianceSummary = {
    status,
    score,
    detectionCount,
    lastDetectedIssue: issues[0] ?? null,
    activityBranchCount: activityBranchIds.size,
    assignedBranchCount: assignedBranchIds.size,
    missingAssignmentCount,
    activitySummary,
  };

  if (recordAuditEvent && status === "POTENTIAL_MULTI_BRANCH") {
    await recordComplianceAuditEvent({ businessId, planCode: planCode ?? "UNKNOWN", summary });
  }

  return summary;
}

async function recordComplianceAuditEvent({
  businessId,
  planCode,
  summary,
}: {
  businessId: number;
  planCode: string;
  summary: PlanComplianceSummary;
}) {
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
      severity: "MEDIUM",
      status: "warning",
      planCode,
      complianceScore: summary.score,
      detectionCount: summary.detectionCount,
      lastDetectedIssue: summary.lastDetectedIssue,
      activityBranchCount: summary.activityBranchCount,
      assignedBranchCount: summary.assignedBranchCount,
      missingAssignmentCount: summary.missingAssignmentCount,
      activitySummary: summary.activitySummary,
      detectedAt: new Date().toISOString(),
    },
  });
}