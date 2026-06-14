import "server-only";

import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createAbuseAlert } from "@/lib/alert-engine";

type CooldownClient = Prisma.TransactionClient | typeof prisma;

type CooldownViolation = {
  type: string;
  message: string;
  metadata: Prisma.InputJsonValue;
};

export function canOverrideCooldown(role: UserRole) {
  return role === "BUSINESS_OWNER" || role === "BRANCH_MANAGER";
}

export async function enforceStampCooldown({
  tx = prisma,
  businessId,
  branchId,
  customerProgramMembershipId,
  loyaltyProgramId,
  staffUserId,
  staffRole,
  quantity,
  overrideRequested,
  overrideReason,
  now,
}: {
  tx?: CooldownClient;
  businessId: number;
  branchId: number | null;
  customerProgramMembershipId: number;
  loyaltyProgramId: number;
  staffUserId: number;
  staffRole: UserRole;
  quantity: number;
  overrideRequested: boolean;
  overrideReason?: string | null;
  now: Date;
}) {
  const rule = await tx.cooldownRule.findFirst({
    where: { businessId, active: true },
    orderBy: { updatedAt: "desc" },
  });

  const violations: CooldownViolation[] = [];
  const maxPerTransaction = rule?.maximumStampsPerTransaction ?? 5;
  if (quantity > maxPerTransaction) {
    violations.push({
      type: "MAX_STAMPS_PER_TRANSACTION",
      message: `Maximum stamps per transaction is ${maxPerTransaction}.`,
      metadata: { quantity, maxPerTransaction },
    });
  }

  if (rule?.minimumMinutesBetweenStamps && rule.minimumMinutesBetweenStamps > 0) {
    const since = new Date(now.getTime() - rule.minimumMinutesBetweenStamps * 60 * 1000);
    const recent = await tx.stampTransaction.findFirst({
      where: {
        businessId,
        customerProgramMembershipId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
    if (recent) {
      violations.push({
        type: "MINIMUM_MINUTES_BETWEEN_STAMPS",
        message: `This customer received a stamp less than ${rule.minimumMinutesBetweenStamps} minute(s) ago.`,
        metadata: {
          minimumMinutesBetweenStamps: rule.minimumMinutesBetweenStamps,
          recentTransactionId: recent.id,
          recentTransactionAt: recent.createdAt.toISOString(),
        },
      });
    }
  }

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  if (rule?.maximumStampsPerCustomerPerDay) {
    const customerDaily = await tx.stampTransaction.aggregate({
      where: { businessId, customerProgramMembershipId, createdAt: { gte: dayStart } },
      _sum: { quantity: true },
    });
    const current = customerDaily._sum.quantity ?? 0;
    if (current + quantity > rule.maximumStampsPerCustomerPerDay) {
      violations.push({
        type: "MAX_STAMPS_PER_CUSTOMER_PER_DAY",
        message: `Customer daily stamp limit is ${rule.maximumStampsPerCustomerPerDay}.`,
        metadata: { current, quantity, maximumStampsPerCustomerPerDay: rule.maximumStampsPerCustomerPerDay },
      });
    }
  }

  if (rule?.maximumStampsPerStaffPerDay) {
    const staffDaily = await tx.stampTransaction.aggregate({
      where: { businessId, issuedByUserId: staffUserId, createdAt: { gte: dayStart } },
      _sum: { quantity: true },
    });
    const current = staffDaily._sum.quantity ?? 0;
    if (current + quantity > rule.maximumStampsPerStaffPerDay) {
      violations.push({
        type: "MAX_STAMPS_PER_STAFF_PER_DAY",
        message: `Staff daily stamp limit is ${rule.maximumStampsPerStaffPerDay}.`,
        metadata: { current, quantity, maximumStampsPerStaffPerDay: rule.maximumStampsPerStaffPerDay },
      });
    }
  }

  if (violations.length === 0) return;

  const overrideUsed = overrideRequested && canOverrideCooldown(staffRole);
  if (overrideRequested && !canOverrideCooldown(staffRole)) {
    violations.push({
      type: "UNAUTHORIZED_COOLDOWN_OVERRIDE",
      message: "Staff cannot override cooldown rules.",
      metadata: { staffRole },
    });
  }
  if (overrideRequested && canOverrideCooldown(staffRole) && !overrideReason?.trim()) {
    violations.push({
      type: "MISSING_COOLDOWN_OVERRIDE_REASON",
      message: "Override reason is required.",
      metadata: { staffRole },
    });
  }

  await tx.cooldownEvent.createMany({
    data: violations.map((violation) => ({
      businessId,
      branchId,
      customerProgramMembershipId,
      staffUserId,
      loyaltyProgramId,
      cooldownRuleId: rule?.id ?? null,
      violationType: violation.type,
      attemptedQuantity: quantity,
      overrideUsed,
      overrideReason: overrideUsed ? overrideReason?.trim() || null : null,
      metadata: violation.metadata,
      createdAt: now,
    })),
  });

  if (rule?.generateAlert !== false) {
    for (const violation of violations) {
      await createAbuseAlert({
        tx,
        businessId,
        branchId,
        userId: staffUserId,
        customerProgramMembershipId,
        alertType: `COOLDOWN_${violation.type}`,
        severity: overrideUsed ? "MEDIUM" : "HIGH",
        description: violation.message,
        dedupeScope: `${customerProgramMembershipId}:${staffUserId}:${violation.type}`,
        metadata: violation.metadata,
      });
    }
  }

  if (overrideUsed && overrideReason?.trim()) {
    await logAuditEvent({
      tx,
      actorUserId: staffUserId,
      businessId,
      branchId,
      action: "COOLDOWN_OVERRIDE",
      entityType: "customer_program_membership",
      entityId: customerProgramMembershipId,
      metadata: {
        violations: violations.map((violation) => violation.type),
        overrideReason: overrideReason.trim(),
        quantity,
      },
    });
    return;
  }

  throw new Error(violations[0]?.message ?? "Cooldown rule violation.");
}
