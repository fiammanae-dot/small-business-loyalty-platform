import "server-only";

import type { ActivityAlertSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { after } from "next/server";
import { sendHighRiskAlertEmail } from "@/lib/alert-email";

type AlertClient = Prisma.TransactionClient | typeof prisma;

/**
 * Every alert rule, in one place. The Settings "Alert policies" rows are keyed
 * by `ruleType`; each rule owns one or more `alertTypes` (what is stored on an
 * alert). The detectors read the business's policy for the threshold, the
 * level and whether the rule is on, so what the owner sets is what runs.
 * A threshold of 0 or a disabled policy switches the rule off.
 */
export type AlertRule = {
  ruleType: string;
  policyName: string;
  /** Plain explanation shown in Settings; {n} is the threshold. */
  explain: string;
  thresholdValue: number;
  severity: ActivityAlertSeverity;
  alertTypes: readonly string[];
};

export const ALERT_RULES = [
  { ruleType: "MULTI_STAMP_THRESHOLD", policyName: "Several stamps at once", explain: "Alert when staff add {n} or more stamps or visits in one go.", thresholdValue: 3, severity: "LOW", alertTypes: ["MULTIPLE_STAMPS_QUANTITY_3", "MULTIPLE_STAMPS_QUANTITY_5"] },
  { ruleType: "REPEATED_STAMPS_SHORT_WINDOW", policyName: "Repeated stamps within 10 minutes", explain: "Alert when one staff member gives the same customer {n} or more stamps or visits within 10 minutes.", thresholdValue: 3, severity: "MEDIUM", alertTypes: ["REPEATED_STAMPS_SHORT_WINDOW"] },
  { ruleType: "CUSTOMER_DAILY_STAMP_LIMIT", policyName: "Customer stamps in 24 hours", explain: "Alert when a customer gets more than {n} stamps or visits in 24 hours.", thresholdValue: 8, severity: "HIGH", alertTypes: ["CUSTOMER_24H_HIGH_VOLUME"] },
  { ruleType: "STAFF_DAILY_STAMP_LIMIT", policyName: "Staff stamps in 24 hours", explain: "Alert when one staff member gives more than {n} stamps or visits in 24 hours.", thresholdValue: 50, severity: "HIGH", alertTypes: ["STAFF_24H_HIGH_VOLUME"] },
  { ruleType: "FAST_REWARD_PROGRESS", policyName: "Card filled on the first day", explain: "Alert when a customer fills their card or uses their whole package within {n} hours of joining.", thresholdValue: 24, severity: "MEDIUM", alertTypes: ["FAST_REWARD_PROGRESS"] },
  { ruleType: "HIGH_STAMP_UNDO_COUNT", policyName: "Undone stamps", explain: "Alert when one staff member undoes {n} or more stamps or visits in 24 hours.", thresholdValue: 3, severity: "MEDIUM", alertTypes: ["HIGH_STAMP_UNDO_COUNT"] },
  { ruleType: "COOLDOWN_VIOLATION_THRESHOLD", policyName: "Loyalty rule breaks", explain: "Alert when the same customer and staff member break your Loyalty rules {n} or more times in 24 hours (overrides included).", thresholdValue: 3, severity: "HIGH", alertTypes: ["COOLDOWN_"] },
  { ruleType: "INVALID_SCAN_THRESHOLD", policyName: "Invalid scans", explain: "Alert when one staff member scans {n} or more invalid or disabled cards in 24 hours.", thresholdValue: 10, severity: "MEDIUM", alertTypes: ["INVALID_SCAN_VOLUME"] },
  { ruleType: "WRONG_BUSINESS_SCAN_THRESHOLD", policyName: "Other businesses' cards", explain: "Alert when one staff member scans {n} or more cards from other businesses in 24 hours.", thresholdValue: 3, severity: "MEDIUM", alertTypes: ["WRONG_BUSINESS_SCAN_VOLUME"] },
  { ruleType: "REFERRAL_ABUSE_THRESHOLD", policyName: "Referral volume", explain: "Alert when one customer refers {n} or more new customers in 24 hours.", thresholdValue: 5, severity: "HIGH", alertTypes: ["REFERRAL_HIGH_VOLUME"] },
  { ruleType: "HIGH_REWARD_ACTIVITY_THRESHOLD", policyName: "Rewards redeemed by one staff member", explain: "Alert when one staff member redeems {n} or more rewards in 24 hours.", thresholdValue: 5, severity: "HIGH", alertTypes: ["HIGH_REWARD_REDEMPTIONS"] },
  { ruleType: "CASHBACK_LARGE_BILL", policyName: "Cashback on a large bill", explain: "Alert when cashback is added on a bill of AED {n} or more.", thresholdValue: 5000, severity: "MEDIUM", alertTypes: ["CASHBACK_LARGE_BILL"] },
  { ruleType: "CASHBACK_FREQUENT_EARN", policyName: "Cashback added often", explain: "Alert when cashback is added to the same customer {n} or more times in 24 hours.", thresholdValue: 3, severity: "HIGH", alertTypes: ["CASHBACK_FREQUENT_EARN"] },
  { ruleType: "CASHBACK_LARGE_REDEMPTION", policyName: "Large cashback redemption", explain: "Alert when a customer spends AED {n} or more of cashback in one go.", thresholdValue: 500, severity: "MEDIUM", alertTypes: ["CASHBACK_LARGE_REDEMPTION"] },
] as const satisfies readonly AlertRule[];

/** Kept for callers that list the rules (Settings, the alerts filter, new businesses). */
export const defaultAbusePolicies = ALERT_RULES.map(({ policyName, ruleType, thresholdValue, severity }) => ({ policyName, ruleType, thresholdValue, severity }));

/** Which rule an alert type belongs to ("COOLDOWN_" matches every cooldown alert). */
export function ruleForAlertType(alertType: string): AlertRule | null {
  return (ALERT_RULES as readonly AlertRule[]).find((rule) => rule.alertTypes.some((type) => (type.endsWith("_") ? alertType.startsWith(type) : alertType === type))) ?? null;
}

export function alertRuleFor(ruleType: string): AlertRule | null {
  return (ALERT_RULES as readonly AlertRule[]).find((rule) => rule.ruleType === ruleType) ?? null;
}

/** Prisma filter for every alert a Settings rule can produce (used by the alert list filter). */
export function alertTypeFilterForRule(ruleType: string): Prisma.ActivityAlertWhereInput | null {
  const rule = alertRuleFor(ruleType);
  if (!rule) return null;
  return {
    OR: rule.alertTypes.map((type) => (type.endsWith("_") ? { alertType: { startsWith: type } } : { alertType: type })),
  };
}

/**
 * The business's setting for a rule: on/off, threshold and level, falling back
 * to the default when the business has no row for it yet.
 */
export async function getAlertRule(tx: AlertClient, businessId: number, ruleType: string) {
  const rule = alertRuleFor(ruleType);
  const policy = await tx.abusePolicy.findFirst({ where: { businessId, ruleType } });
  const threshold = policy ? Number(policy.thresholdValue) : (rule?.thresholdValue ?? 0);
  return {
    enabled: (policy ? policy.enabled : true) && threshold > 0,
    threshold,
    severity: (policy?.severity ?? rule?.severity ?? "MEDIUM") as ActivityAlertSeverity,
    dedupeWindowHours: policy?.dedupeWindowHours ?? 24,
  };
}

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

const SEVERITY_ORDER: ActivityAlertSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SEVERITY_BASE_RISK: Record<ActivityAlertSeverity, number> = { LOW: 25, MEDIUM: 55, HIGH: 80, CRITICAL: 95 };

/**
 * Risk starts from the alert's level and rises 5 points with every repeat, so
 * the level shown and the risk number always agree (see priorityFromRisk).
 */
export function riskScoreForAlert(severity: ActivityAlertSeverity, occurrenceCount = 1) {
  return Math.min(100, SEVERITY_BASE_RISK[severity] + Math.max(0, occurrenceCount - 1) * 5);
}

export function priorityFromRisk(riskScore: number): ActivityAlertSeverity {
  if (riskScore >= 90) return "CRITICAL";
  if (riskScore >= 70) return "HIGH";
  if (riskScore >= 40) return "MEDIUM";
  return "LOW";
}

/** The higher of two levels. */
export function maxSeverity(a: ActivityAlertSeverity, b: ActivityAlertSeverity): ActivityAlertSeverity {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

export function alertCategory(alertType: string) {
  if (alertType.startsWith("CASHBACK")) return "Cashback";
  if (alertType.startsWith("PACKAGE")) return "Package";
  if (alertType.includes("COOLDOWN")) return "Cooldown";
  if (alertType.includes("REFERRAL")) return "Referral";
  if (alertType.includes("SCAN") || alertType.includes("WRONG_BUSINESS")) return "Scanning";
  if (alertType.includes("STAFF") || alertType.includes("UNDO") || alertType.includes("REWARD_REDEMPTIONS")) return "Staff";
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
  // The owner's setting for this alert's rule: off means no alert at all.
  const rule = ruleForAlertType(alertType);
  const setting = rule ? await getAlertRule(tx, businessId, rule.ruleType) : null;
  if (setting && !setting.enabled) return null;
  // The owner's level for the rule wins. Only a detector's stronger variant
  // (e.g. the maximum 5 stamps at once) can lift it above that level.
  const isStrongerVariant = rule ? SEVERITY_ORDER.indexOf(severity) > SEVERITY_ORDER.indexOf(rule.severity) : false;
  const level = setting ? (isStrongerVariant ? maxSeverity(setting.severity, severity) : setting.severity) : severity;

  const now = new Date();
  const dedupeWindowHours = setting?.dedupeWindowHours ?? 24;
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
    const riskScore = riskScoreForAlert(level, occurrenceCount);
    // Repeats raise the risk, and the level shown follows the risk.
    const effective = maxSeverity(level, priorityFromRisk(riskScore));
    const updated = await tx.activityAlert.update({
      where: { id: existing.id },
      data: {
        occurrenceCount,
        lastDetectedAt: now,
        riskScore,
        priority: effective,
        severity: effective,
        description,
      },
    });
    if (isUrgent(effective) && !isUrgent(existing.severity)) notifyOwnersOfAlert(updated.id);
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

  const initialRisk = riskScoreForAlert(level, 1);
  const priority = maxSeverity(level, priorityFromRisk(initialRisk));
  const alert = await tx.activityAlert.create({
    data: {
      businessId,
      branchId: branchId ?? null,
      userId: userId ?? null,
      customerProgramMembershipId: customerProgramMembershipId ?? null,
      alertType,
      severity: priority,
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

  if (isUrgent(priority)) notifyOwnersOfAlert(alert.id);
  return alert;
}

function isUrgent(level: ActivityAlertSeverity) {
  return level === "HIGH" || level === "CRITICAL";
}

/**
 * Email the business owners about a high-risk alert, after the request
 * finishes (and so after the transaction that created the alert commits).
 * Best-effort: an email problem never blocks the counter.
 */
function notifyOwnersOfAlert(alertId: number) {
  const send = () => sendHighRiskAlertEmail(alertId).catch((error) => console.warn("[alerts] owner email failed", error));
  try {
    after(send);
  } catch {
    // Outside a request (scripts, tests): send right away instead.
    void send();
  }
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

/**
 * After a bad scan (invalid/disabled card, or a card from another business),
 * alert when the same staff member reaches the owner's threshold in 24 hours.
 */
export async function checkScanVolumeAlert({
  businessId,
  branchId,
  userId,
  userName,
  result,
}: {
  businessId: number;
  branchId: number | null;
  userId: number;
  userName: string;
  result: "INVALID" | "WRONG_BUSINESS" | "DISABLED";
}) {
  const wrongBusiness = result === "WRONG_BUSINESS";
  const setting = await getAlertRule(prisma, businessId, wrongBusiness ? "WRONG_BUSINESS_SCAN_THRESHOLD" : "INVALID_SCAN_THRESHOLD");
  if (!setting.enabled) return null;
  const count = await prisma.scanEvent.count({
    where: {
      businessId,
      scannedByUserId: userId,
      result: wrongBusiness ? "WRONG_BUSINESS" : { in: ["INVALID", "DISABLED"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (count < setting.threshold) return null;
  return createAbuseAlert({
    businessId,
    branchId,
    userId,
    alertType: wrongBusiness ? "WRONG_BUSINESS_SCAN_VOLUME" : "INVALID_SCAN_VOLUME",
    severity: setting.severity,
    description: wrongBusiness
      ? `${userName} scanned ${count} cards from other businesses in 24 hours (your limit is ${setting.threshold}).`
      : `${userName} scanned ${count} invalid or disabled cards in 24 hours (your limit is ${setting.threshold}).`,
    dedupeScope: `scan:${userId}`,
    metadata: { count, threshold: setting.threshold, result },
  });
}
