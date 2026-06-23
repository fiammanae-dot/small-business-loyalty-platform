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
  const [branches, staffUsers, enrollments, stamps, redemptions, scans] = await Promise.all([
    prisma.branch.findMany({ where: { businessId }, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { businessId, role: { in: ["STAFF", "BRANCH_MANAGER"] }, status: "ACTIVE" },
      select: { id: true, role: true, branchId: true },
    }),
    prisma.businessCustomerMembership.findMany({
      where: { businessId, createdAt: { gte: since }, createdBranchId: { not: null } },
      select: { createdBranchId: true },
    }),
    prisma.stampTransaction.findMany({
      where: { businessId, createdAt: { gte: since }, branchId: { not: null } },
      select: { branchId: true },
    }),
    prisma.rewardRedemption.findMany({
      where: { businessId, redeemedAt: { gte: since }, branchId: { not: null } },
      select: { branchId: true },
    }),
    prisma.scanEvent.findMany({
      where: { businessId, createdAt: { gte: since }, branchId: { not: null } },
      select: { branchId: true },
    }),
  ]);

  const activityBranchIds = new Set<number>();
  for (const enrollment of enrollments) if (enrollment.createdBranchId) activityBranchIds.add(enrollment.createdBranchId);
  for (const stamp of stamps) if (stamp.branchId) activityBranchIds.add(stamp.branchId);
  for (const redemption of redemptions) if (redemption.branchId) activityBranchIds.add(redemption.branchId);
  for (const scan of scans) if (scan.branchId) activityBranchIds.add(scan.branchId);

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