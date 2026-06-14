import "server-only";

import type { ActivityAlertSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

type AlertClient = Prisma.TransactionClient | typeof prisma;

export const defaultAbusePolicies = [
  { policyName: "Customer daily stamp limit", ruleType: "CUSTOMER_DAILY_STAMP_LIMIT", thresholdValue: 8, severity: "HIGH" },
  { policyName: "Staff daily stamp limit", ruleType: "STAFF_DAILY_STAMP_LIMIT", thresholdValue: 50, severity: "HIGH" },
  { policyName: "Multi-stamp threshold", ruleType: "MULTI_STAMP_THRESHOLD", thresholdValue: 3, severity: "LOW" },
  { policyName: "Cooldown violation threshold", ruleType: "COOLDOWN_VIOLATION_THRESHOLD", thresholdValue: 3, severity: "HIGH" },
  { policyName: "Invalid scan threshold", ruleType: "INVALID_SCAN_THRESHOLD", thresholdValue: 10, severity: "MEDIUM" },
  { policyName: "Wrong-business scan threshold", ruleType: "WRONG_BUSINESS_SCAN_THRESHOLD", thresholdValue: 3, severity: "MEDIUM" },
  { policyName: "Referral abuse threshold", ruleType: "REFERRAL_ABUSE_THRESHOLD", thresholdValue: 5, severity: "HIGH" },
  { policyName: "High reward activity", ruleType: "HIGH_REWARD_ACTIVITY_THRESHOLD", thresholdValue: 5, severity: "HIGH" },
] as const;

export async function createDefaultAbusePolicies(tx: AlertClient, businessId: number) {
  await tx.abusePolicy.createMany({
    data: defaultAbusePolicies.map((policy) => ({
      businessId,
      policyName: policy.policyName,
      ruleType: policy.ruleType,
      thresholdValue: policy.thresholdValue,
      severity: policy.severity,
      enabled: true,
      dedupeWindowHours: 24,
    })),
    skipDuplicates: true,
  });
}

export function riskScoreForAlert(alertType: string, severity: ActivityAlertSeverity, occurrenceCount = 1) {
  const base =
    alertType.includes("REFERRAL")
      ? 80
      : alertType.includes("COOLDOWN")
        ? 75
        : alertType.includes("STAFF")
          ? 70
          : alertType.includes("WRONG_BUSINESS")
            ? 60
            : alertType.includes("CUSTOMER")
              ? 50
              : severity === "HIGH"
                ? 80
                : severity === "MEDIUM"
                  ? 55
                  : severity === "CRITICAL"
                    ? 95
                    : 25;

  return Math.min(100, base + Math.max(0, occurrenceCount - 1) * 5);
}

export function priorityFromRisk(riskScore: number): ActivityAlertSeverity {
  if (riskScore >= 90) return "CRITICAL";
  if (riskScore >= 70) return "HIGH";
  if (riskScore >= 40) return "MEDIUM";
  return "LOW";
}

export function alertCategory(alertType: string) {
  if (alertType.includes("COOLDOWN")) return "Cooldown";
  if (alertType.includes("REFERRAL")) return "Referral";
  if (alertType.includes("SCAN") || alertType.includes("WRONG_BUSINESS")) return "Scanning";
  if (alertType.includes("STAFF")) return "Staff";
  return "Customer";
}

export async function createAbuseAlert({
  tx = prisma,
  businessId,
  branchId,
  userId,
  customerProgramMembershipId,
  alertType,
  severity,
  description,
  dedupeScope,
  metadata = {},
}: {
  tx?: AlertClient;
  businessId: number;
  branchId?: number | null;
  userId?: number | null;
  customerProgramMembershipId?: number | null;
  alertType: string;
  severity: ActivityAlertSeverity;
  description: string;
  dedupeScope?: string | number | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const policy = await tx.abusePolicy.findFirst({
    where: { businessId, ruleType: alertType, enabled: true },
  });
  if (policy && Number(policy.thresholdValue) <= 0) return null;

  const now = new Date();
  const dedupeWindowHours = policy?.dedupeWindowHours ?? 24;
  const dedupeKey = `${businessId}:${alertType}:${dedupeScope ?? customerProgramMembershipId ?? userId ?? branchId ?? "global"}`;
  const dedupeStart = new Date(now.getTime() - dedupeWindowHours * 60 * 60 * 1000);

  const existing = await tx.activityAlert.findFirst({
    where: {
      businessId,
      dedupeKey,
      status: { in: ["OPEN", "ASSIGNED", "UNDER_REVIEW", "ESCALATED"] },
      lastDetectedAt: { gte: dedupeStart },
    },
    orderBy: { lastDetectedAt: "desc" },
  });

  if (existing) {
    const occurrenceCount = existing.occurrenceCount + 1;
    const riskScore = riskScoreForAlert(alertType, policy?.severity ?? severity, occurrenceCount);
    const priority = priorityFromRisk(riskScore);
    const updated = await tx.activityAlert.update({
      where: { id: existing.id },
      data: {
        occurrenceCount,
        lastDetectedAt: now,
        riskScore,
        priority,
        severity: policy?.severity ?? severity,
        description,
      },
    });
    await tx.alertEvent.create({
      data: {
        alertId: updated.id,
        businessId,
        eventType: "ALERT_UPDATED",
        metadata: { reason: "dedupe_occurrence", occurrenceCount, metadata },
      },
    });
    return updated;
  }

  const initialRisk = riskScoreForAlert(alertType, policy?.severity ?? severity, 1);
  const priority = priorityFromRisk(initialRisk);
  const alert = await tx.activityAlert.create({
    data: {
      businessId,
      branchId: branchId ?? null,
      userId: userId ?? null,
      customerProgramMembershipId: customerProgramMembershipId ?? null,
      alertType,
      severity: policy?.severity ?? severity,
      priority,
      riskScore: initialRisk,
      dedupeKey,
      occurrenceCount: 1,
      firstDetectedAt: now,
      lastDetectedAt: now,
      description,
      status: "OPEN",
      createdAt: now,
    },
  });

  await tx.alertEvent.create({
    data: {
      alertId: alert.id,
      businessId,
      eventType: "ALERT_CREATED",
      metadata,
    },
  });

  return alert;
}

export async function recordAlertLifecycleEvent({
  tx = prisma,
  alertId,
  businessId,
  actorUserId,
  eventType,
  metadata = {},
}: {
  tx?: AlertClient;
  alertId: number;
  businessId: number;
  actorUserId?: number | null;
  eventType: "ALERT_UPDATED" | "ALERT_ASSIGNED" | "ALERT_ESCALATED" | "ALERT_RESOLVED" | "ALERT_DISMISSED" | "ALERT_REOPENED";
  metadata?: Prisma.InputJsonValue;
}) {
  await tx.alertEvent.create({
    data: {
      alertId,
      businessId,
      actorUserId: actorUserId ?? null,
      eventType,
      metadata,
    },
  });

  await logAuditEvent({
    tx,
    actorUserId,
    businessId,
    action: eventType,
    entityType: "activity_alert",
    entityId: alertId,
    metadata,
  });
}
