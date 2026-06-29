"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { requireActiveBranch, requireUsableSubscription } from "@/lib/commercial-access";
import { createAbuseAlert } from "@/lib/alert-engine";
import { enforceStampCooldown } from "@/lib/cooldowns";
import { validateCsrfForm } from "@/lib/csrf";
import { createCustomerNotification } from "@/lib/customer-notifications";
import { calculateCustomerTier, isTierUpgrade } from "@/lib/customer-tiers";
import { createEngagementEventIfAllowed, createProgramEngagementEvents } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";
import { getStartingBonusStampsForEvent, progressValue } from "@/lib/programs";
import { qualifyReferralFromFirstStamp } from "@/lib/referrals";
import { isRewardReady } from "@/lib/rewards";
import { roleHomePath } from "@/lib/roles";
import { getCurrentUser, hasActiveBusinessAccess, INACTIVE_BUSINESS_ACCESS_MESSAGE } from "@/lib/session";

const stampIssueSchema = z
  .object({
    scanToken: z.string().trim().min(1, "Scan token is required."),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(5, "Quantity cannot exceed 5."),
    reason: z.string().trim().optional(),
    idempotencyKey: z.string().trim().min(16, "Security token is required."),
    overrideCooldown: z.boolean(),
    overrideReason: z.string().trim().optional(),
  })
  .refine((data) => data.quantity === 1 || Boolean(data.reason), {
    message: "Reason is required when issuing more than one stamp.",
    path: ["reason"],
  });

const REPEATED_STAMP_WINDOW_MINUTES = 10;
const REPEATED_STAMP_REASON_THRESHOLD = 3;
const REPEATED_STAMP_REASON_MESSAGE = "Multiple stamps were issued to this customer in a short time. Please provide a reason.";
const STAFF_REWARD_READY_STAMP_BLOCK_MESSAGE = "Reward ready. Redeem the reward before adding another stamp.";
const OUT_OF_BRANCH_ACTION_MESSAGE = "This customer is outside your assigned branch scope.";
const STAMP_UNDO_WINDOW_MINUTES = 3;
const STAMP_UNDO_REASONS = ["Wrong customer scanned", "Duplicate scan", "Customer cancelled purchase", "System error", "Other"] as const;

const stampUndoSchema = z.object({
  scanToken: z.string().trim().min(1, "Scan token is required."),
  stampTransactionId: z.coerce.number().int().positive("Stamp transaction is required."),
  reason: z.enum(STAMP_UNDO_REASONS, { message: "Undo reason is required." }),
});

function isOutOfAssignedBranch(user: { role: string; branchId?: number | null }, membership: { createdBranchId?: number | null }) {
  return (user.role === "STAFF" || user.role === "BRANCH_MANAGER") && (!user.branchId || membership.createdBranchId !== user.branchId);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(token: string, message: string): never {
  redirect(`/scan/${token}?error=${encodeURIComponent(message)}`);
}

function success(token: string, transactionId: number): never {
  redirect(`/scan/${token}?issued=${transactionId}`);
}

function redemptionSuccess(token: string, redemptionId: number): never {
  redirect(`/scan/${token}?redeemed=${redemptionId}`);
}

function undoSuccess(token: string, transactionId: number): never {
  redirect(`/scan/${token}?undone=${transactionId}`);
}

export async function issueStampAction(formData: FormData) {
  const token = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:stamp");
  } catch {
    fail(token, "Security check failed. Please refresh and try again.");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"].includes(user.role)) redirect(roleHomePath[user.role]);
  if (!user.businessId) redirect(roleHomePath[user.role]);
  if (!hasActiveBusinessAccess(user)) fail(token, INACTIVE_BUSINESS_ACCESS_MESSAGE);
  await requireUsableSubscription(user.businessId).catch((error) => fail(token, error.message));
  if (user.branchId) {
    await requireActiveBranch(user.branchId, user.businessId).catch((error) => fail(token, error.message));
  }

  const parsed = stampIssueSchema.safeParse({
    scanToken: getString(formData, "scanToken"),
    quantity: getString(formData, "quantity") || "1",
    reason: getString(formData, "reason"),
    idempotencyKey: getString(formData, "idempotencyKey"),
    overrideCooldown: getString(formData, "overrideCooldown") === "on",
    overrideReason: getString(formData, "overrideReason"),
  });

  if (!parsed.success) fail(token, parsed.error.issues[0]?.message ?? "Validation failed.");

  const data = parsed.data;
  const scannerBranch = user.branchId
    ? await prisma.branch.findFirst({
        where: { id: user.branchId, businessId: user.businessId },
        select: { id: true, name: true },
      })
    : null;

  const programMembership = await prisma.customerProgramMembership.findUnique({
    where: { scanToken: data.scanToken },
    include: {
      loyaltyProgram: true,
      businessCustomerMembership: {
        include: {
          globalCustomer: true,
          createdBranch: true,
        },
      },
    },
  });

  if (!programMembership) fail(data.scanToken, "Invalid or unavailable loyalty QR.");

  const businessMembership = programMembership.businessCustomerMembership;
  if (businessMembership.businessId !== user.businessId) {
    fail(data.scanToken, "This loyalty QR does not belong to your business.");
  }

  if (isOutOfAssignedBranch(user, businessMembership)) {
    fail(data.scanToken, OUT_OF_BRANCH_ACTION_MESSAGE);
  }

  if (
    programMembership.scanStatus !== "ACTIVE" ||
    programMembership.status !== "ACTIVE" ||
    !programMembership.loyaltyProgram.active ||
    businessMembership.status !== "ACTIVE"
  ) {
    fail(data.scanToken, "Invalid or unavailable loyalty QR.");
  }

  if (
    user.role === "STAFF" &&
    isRewardReady({
      earnedStamps: programMembership.earnedStamps,
      bonusStamps: programMembership.bonusStamps,
      requiredStamps: programMembership.loyaltyProgram.requiredStamps,
    })
  ) {
    fail(data.scanToken, STAFF_REWARD_READY_STAMP_BLOCK_MESSAGE);
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const customerName = `${businessMembership.globalCustomer.firstName} ${businessMembership.globalCustomer.lastName ?? ""}`.trim();
  const issuedByName = user.name;
  const branchId = scannerBranch?.id ?? businessMembership.createdBranchId ?? null;
  const branchName = scannerBranch?.name ?? businessMembership.createdBranch?.name ?? "Unassigned";

  const existingTransaction = await prisma.stampTransaction.findUnique({
    where: { idempotencyKey: data.idempotencyKey },
    select: { id: true, businessId: true, customerProgramMembershipId: true },
  });
  if (
    existingTransaction &&
    existingTransaction.businessId === user.businessId &&
    existingTransaction.customerProgramMembershipId === programMembership.id
  ) {
    success(data.scanToken, existingTransaction.id);
  }

  try {
    await enforceStampCooldown({
      businessId: user.businessId as number,
      branchId,
      customerProgramMembershipId: programMembership.id,
      loyaltyProgramId: programMembership.loyaltyProgramId,
      staffUserId: user.id,
      staffRole: user.role,
      quantity: data.quantity,
      overrideRequested: data.overrideCooldown,
      overrideReason: data.overrideReason,
      now,
    });
  } catch (error) {
    fail(data.scanToken, error instanceof Error ? error.message : "Cooldown rule violation.");
  }

  const repeatedStampWindowStart = new Date(now.getTime() - REPEATED_STAMP_WINDOW_MINUTES * 60 * 1000);
  const recentRepeatedStamps = await prisma.stampTransaction.aggregate({
    where: {
      businessId: user.businessId as number,
      issuedByUserId: user.id,
      customerProgramMembershipId: programMembership.id,
      createdAt: { gte: repeatedStampWindowStart },
    },
    _sum: { quantity: true },
  });
  const repeatedStampWindowTotal = (recentRepeatedStamps._sum.quantity ?? 0) + data.quantity;
  const repeatedStampThresholdReached = repeatedStampWindowTotal >= REPEATED_STAMP_REASON_THRESHOLD;
  if (repeatedStampThresholdReached && !data.reason) {
    fail(data.scanToken, REPEATED_STAMP_REASON_MESSAGE);
  }

  let transactionId: number;
  try {
    transactionId = await prisma.$transaction(async (tx) => {
    const updatedMembership = await tx.customerProgramMembership.update({
      where: { id: programMembership.id },
      data: {
        earnedStamps: { increment: data.quantity },
        scanLastUsedAt: now,
      },
      include: {
        loyaltyProgram: true,
      },
    });

    const stampTransaction = await tx.stampTransaction.create({
      data: {
        businessId: user.businessId as number,
        branchId,
        customerProgramMembershipId: programMembership.id,
        issuedByUserId: user.id,
        quantity: data.quantity,
        reason: data.reason || null,
        source: "QR_SCAN",
        idempotencyKey: data.idempotencyKey,
        createdAt: now,
      },
      select: { id: true },
    });

    const customer24h = await tx.stampTransaction.aggregate({
      where: {
        customerProgramMembershipId: programMembership.id,
        createdAt: { gte: since24h },
      },
      _sum: { quantity: true },
    });

    const staff24h = await tx.stampTransaction.aggregate({
      where: {
        issuedByUserId: user.id,
        createdAt: { gte: since24h },
      },
      _sum: { quantity: true },
    });

    const alerts: Array<{
      alertType: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      description: string;
      metadata?: Record<string, string | number | null>;
    }> = [];

    if (data.quantity >= 3) {
      alerts.push({
        alertType: "MULTIPLE_STAMPS_QUANTITY_3",
        severity: "LOW",
        description: `${issuedByName} issued ${data.quantity} stamps to ${customerName} for ${programMembership.loyaltyProgram.name}.`,
      });
    }

    if (data.quantity >= 5) {
      alerts.push({
        alertType: "MULTIPLE_STAMPS_QUANTITY_5",
        severity: "MEDIUM",
        description: `${issuedByName} issued the maximum ${data.quantity} stamps to ${customerName} for ${programMembership.loyaltyProgram.name}.`,
      });
    }

    if (repeatedStampThresholdReached) {
      alerts.push({
        alertType: "REPEATED_STAMPS_SHORT_WINDOW",
        severity: "MEDIUM",
        description: `${issuedByName} issued ${repeatedStampWindowTotal} stamps to ${customerName} for ${programMembership.loyaltyProgram.name} within ${REPEATED_STAMP_WINDOW_MINUTES} minutes. Reason: ${data.reason ?? "Not provided"}.`,
        metadata: {
          staffUserId: user.id,
          staffName: issuedByName,
          customerName,
          programName: programMembership.loyaltyProgram.name,
          stampsInWindow: repeatedStampWindowTotal,
          windowMinutes: REPEATED_STAMP_WINDOW_MINUTES,
          reason: data.reason ?? null,
        },
      });
    }

    const customer24hTotal = customer24h._sum.quantity ?? 0;
    if (customer24hTotal > 8) {
      alerts.push({
        alertType: "CUSTOMER_24H_HIGH_VOLUME",
        severity: "HIGH",
        description: `${customerName} received ${customer24hTotal} earned stamps within 24 hours.`,
      });
    }

    const staff24hTotal = staff24h._sum.quantity ?? 0;
    if (staff24hTotal > 50) {
      alerts.push({
        alertType: "STAFF_24H_HIGH_VOLUME",
        severity: "HIGH",
        description: `${issuedByName} issued ${staff24hTotal} earned stamps within 24 hours.`,
      });
    }

    const previousProgress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
    const updatedProgress = progressValue(updatedMembership.earnedStamps, updatedMembership.bonusStamps);
    await createCustomerNotification({
      tx,
      businessId: user.businessId as number,
      customerId: programMembership.businessCustomerMembershipId,
      notificationType: "NEW_STAMP_EARNED",
      metadata: {
        quantity: data.quantity,
        quantity_plural: data.quantity === 1 ? "" : "s",
        programName: updatedMembership.loyaltyProgram.name,
        rewardName: updatedMembership.loyaltyProgram.rewardName,
        progress: updatedProgress,
        required_stamps: updatedMembership.loyaltyProgram.requiredStamps,
        branchName,
      },
    });

    const [tierSetting, tierVisitEvents] = await Promise.all([
      tx.customerTierSetting.findUnique({ where: { businessId: user.businessId as number } }),
      tx.stampTransaction.findMany({
        where: {
          businessId: user.businessId as number,
          customerProgramMembership: { businessCustomerMembershipId: programMembership.businessCustomerMembershipId },
        },
        select: { createdAt: true },
      }),
    ]);
    const tier = calculateCustomerTier({
      visitEvents: tierVisitEvents.map((visit) => visit.createdAt),
      config: tierSetting,
      achievedTier: businessMembership.currentTier,
      now,
    });
    const upgradedTier = isTierUpgrade(businessMembership.currentTier, tier.tier);
    if (businessMembership.currentTier !== tier.storedTier) {
      await tx.businessCustomerMembership.update({
        where: { id: programMembership.businessCustomerMembershipId },
        data: { currentTier: tier.storedTier, tierUpdatedAt: now },
      });
    }
    if (upgradedTier) {
      await createCustomerNotification({
        tx,
        businessId: user.businessId as number,
        customerId: programMembership.businessCustomerMembershipId,
        notificationType: "TIER_UPGRADED",
        metadata: {
          tier_name: tier.badgeLabel,
          qualifyingVisits: tier.qualifyingVisits,
        },
      });
    }
    if (
      previousProgress < updatedMembership.loyaltyProgram.requiredStamps &&
      updatedProgress >= updatedMembership.loyaltyProgram.requiredStamps
    ) {
      await createCustomerNotification({
        tx,
        businessId: user.businessId as number,
        customerId: programMembership.businessCustomerMembershipId,
        notificationType: "REWARD_AVAILABLE",
        metadata: {
          programName: updatedMembership.loyaltyProgram.name,
          reward_name: updatedMembership.loyaltyProgram.rewardName,
          rewardName: updatedMembership.loyaltyProgram.rewardName,
          progress: updatedProgress,
          required_stamps: updatedMembership.loyaltyProgram.requiredStamps,
        },
      });
    }

    await qualifyReferralFromFirstStamp({
      tx,
      businessId: user.businessId as number,
      referredMembershipId: programMembership.businessCustomerMembershipId,
      loyaltyProgramId: updatedMembership.loyaltyProgramId,
      stampTransactionId: stampTransaction.id,
      branchId,
      now,
    });

    await createProgramEngagementEvents({
      tx,
      businessId: user.businessId as number,
      customerId: programMembership.businessCustomerMembershipId,
      programMembershipId: programMembership.id,
      programName: updatedMembership.loyaltyProgram.name,
      rewardName: updatedMembership.loyaltyProgram.rewardName,
      earnedStamps: updatedMembership.earnedStamps,
      bonusStamps: updatedMembership.bonusStamps,
      requiredStamps: updatedMembership.loyaltyProgram.requiredStamps,
    });

    const firstDayEnd = new Date(updatedMembership.enrolledAt.getTime() + 24 * 60 * 60 * 1000);
    if (updatedProgress >= updatedMembership.loyaltyProgram.requiredStamps && now <= firstDayEnd) {
      alerts.push({
        alertType: "FAST_REWARD_PROGRESS",
        severity: "MEDIUM",
        description: `${customerName} reached full progress for ${updatedMembership.loyaltyProgram.name} within the first day of enrollment.`,
      });
    }

    if (alerts.length > 0) {
      for (const alert of alerts) {
        await createAbuseAlert({
          tx,
          businessId: user.businessId as number,
          branchId,
          userId: user.id,
          customerProgramMembershipId: programMembership.id,
          alertType: alert.alertType,
          severity: alert.severity,
          description: `${alert.description} Branch: ${branchName}.`,
          dedupeScope: `${programMembership.id}:${user.id}:${branchId ?? "none"}`,
          metadata: { branchName, quantity: data.quantity, ...(alert.metadata ?? {}) },
        });
      }
    }

    return stampTransaction.id;
    });
  } catch (error) {
    const existing = await prisma.stampTransaction.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      select: { id: true, businessId: true, customerProgramMembershipId: true },
    });
    if (existing?.businessId === user.businessId && existing.customerProgramMembershipId === programMembership.id) {
      success(data.scanToken, existing.id);
    }
    throw error;
  }

  success(data.scanToken, transactionId);
}

export async function redeemRewardAction(formData: FormData) {
  const scanToken = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:redemption");
  } catch {
    fail(scanToken, "Security check failed. Please refresh and try again.");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"].includes(user.role)) redirect(roleHomePath[user.role]);
  if (!user.businessId) redirect(roleHomePath[user.role]);
  if (!hasActiveBusinessAccess(user)) fail(scanToken, INACTIVE_BUSINESS_ACCESS_MESSAGE);
  await requireUsableSubscription(user.businessId).catch((error) => fail(scanToken, error.message));
  if (user.branchId) {
    await requireActiveBranch(user.branchId, user.businessId).catch((error) => fail(scanToken, error.message));
  }

  const notes = getString(formData, "notes");
  const idempotencyKey = getString(formData, "idempotencyKey");
  if (!scanToken) fail(scanToken, "Scan token is required.");
  if (!idempotencyKey) fail(scanToken, "Security token is required.");

  const scannerBranch = user.branchId
    ? await prisma.branch.findFirst({
        where: { id: user.branchId, businessId: user.businessId },
        select: { id: true, name: true },
      })
    : null;

  const programMembership = await prisma.customerProgramMembership.findUnique({
    where: { scanToken },
    include: {
      loyaltyProgram: true,
      businessCustomerMembership: {
        include: {
          globalCustomer: true,
          createdBranch: true,
        },
      },
    },
  });

  if (!programMembership) fail(scanToken, "Invalid or unavailable loyalty QR.");

  const businessMembership = programMembership.businessCustomerMembership;
  if (businessMembership.businessId !== user.businessId) {
    fail(scanToken, "This loyalty QR does not belong to your business.");
  }

  if (isOutOfAssignedBranch(user, businessMembership)) {
    fail(scanToken, OUT_OF_BRANCH_ACTION_MESSAGE);
  }

  if (
    programMembership.scanStatus !== "ACTIVE" ||
    programMembership.status !== "ACTIVE" ||
    !programMembership.loyaltyProgram.active ||
    businessMembership.status !== "ACTIVE"
  ) {
    fail(scanToken, "Invalid or unavailable loyalty QR.");
  }

  if (
    !isRewardReady({
      earnedStamps: programMembership.earnedStamps,
      bonusStamps: programMembership.bonusStamps,
      requiredStamps: programMembership.loyaltyProgram.requiredStamps,
    })
  ) {
    fail(scanToken, "Reward is not ready yet.");
  }

  const now = new Date();
  const branchId = scannerBranch?.id ?? businessMembership.createdBranchId ?? null;

  const existingRedemption = await prisma.rewardRedemption.findUnique({
    where: { idempotencyKey },
    select: { id: true, businessId: true, customerProgramMembershipId: true },
  });
  if (
    existingRedemption &&
    existingRedemption.businessId === user.businessId &&
    existingRedemption.customerProgramMembershipId === programMembership.id
  ) {
    redemptionSuccess(scanToken, existingRedemption.id);
  }

  let redemption: { id: number };
  try {
    redemption = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "customer_program_memberships" WHERE id = ${programMembership.id} FOR UPDATE`;

    const lockedMembership = await tx.customerProgramMembership.findUnique({
      where: { id: programMembership.id },
      include: {
        loyaltyProgram: true,
        businessCustomerMembership: true,
      },
    });
    if (!lockedMembership) fail(scanToken, "Invalid or unavailable loyalty QR.");
    if (
      lockedMembership.businessCustomerMembership.businessId !== user.businessId ||
      lockedMembership.scanStatus !== "ACTIVE" ||
      lockedMembership.status !== "ACTIVE" ||
      !lockedMembership.loyaltyProgram.active ||
      lockedMembership.businessCustomerMembership.status !== "ACTIVE"
    ) {
      fail(scanToken, "Invalid or unavailable loyalty QR.");
    }
    if (isOutOfAssignedBranch(user, lockedMembership.businessCustomerMembership)) {
      fail(scanToken, OUT_OF_BRANCH_ACTION_MESSAGE);
    }
    if (
      !isRewardReady({
        earnedStamps: lockedMembership.earnedStamps,
        bonusStamps: lockedMembership.bonusStamps,
        requiredStamps: lockedMembership.loyaltyProgram.requiredStamps,
      })
    ) {
      fail(scanToken, "Reward is not ready yet.");
    }

    const created = await tx.rewardRedemption.create({
      data: {
        businessId: user.businessId as number,
        branchId,
        customerProgramMembershipId: programMembership.id,
        loyaltyProgramId: lockedMembership.loyaltyProgramId,
        rewardName: lockedMembership.loyaltyProgram.rewardName,
        requiredStamps: lockedMembership.loyaltyProgram.requiredStamps,
        redeemedByUserId: user.id,
        redeemedAt: now,
        idempotencyKey,
        notes: notes || null,
      },
      select: { id: true },
    });

    await tx.customerProgramMembership.update({
      where: { id: programMembership.id },
      data: {
        earnedStamps: 0,
        bonusStamps: getStartingBonusStampsForEvent({
          startingBonusStamps: lockedMembership.loyaltyProgram.startingBonusStamps,
          startingStampPolicy: lockedMembership.loyaltyProgram.startingStampPolicy,
          event: "CARD_RESET",
        }),
      },
    });

    await createEngagementEventIfAllowed({
      tx,
      businessId: user.businessId as number,
      customerId: lockedMembership.businessCustomerMembershipId,
      eventType: "REWARD_REDEEMED",
      metadata: {
        programMembershipId: lockedMembership.id,
        programName: lockedMembership.loyaltyProgram.name,
        rewardName: lockedMembership.loyaltyProgram.rewardName,
        redemptionId: created.id,
      },
    });

    return created;
    });
  } catch (error) {
    const existing = await prisma.rewardRedemption.findUnique({
      where: { idempotencyKey },
      select: { id: true, businessId: true, customerProgramMembershipId: true },
    });
    if (existing?.businessId === user.businessId && existing.customerProgramMembershipId === programMembership.id) {
      redemptionSuccess(scanToken, existing.id);
    }
    throw error;
  }

  redemptionSuccess(scanToken, redemption.id);
}

export async function undoStampAction(formData: FormData) {
  const scanToken = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:stamp-undo");
  } catch {
    fail(scanToken, "Security check failed. Please refresh and try again.");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"].includes(user.role)) redirect(roleHomePath[user.role]);
  if (!user.businessId) redirect(roleHomePath[user.role]);
  if (!hasActiveBusinessAccess(user)) fail(scanToken, INACTIVE_BUSINESS_ACCESS_MESSAGE);
  await requireUsableSubscription(user.businessId).catch((error) => fail(scanToken, error.message));
  if (user.branchId) {
    await requireActiveBranch(user.branchId, user.businessId).catch((error) => fail(scanToken, error.message));
  }

  const parsed = stampUndoSchema.safeParse({
    scanToken,
    stampTransactionId: getString(formData, "stampTransactionId"),
    reason: getString(formData, "undoReason"),
  });
  if (!parsed.success) fail(scanToken, parsed.error.issues[0]?.message ?? "Undo validation failed.");

  const now = new Date();
  const data = parsed.data;

  const stampTransaction = await prisma.stampTransaction.findFirst({
    where: {
      id: data.stampTransactionId,
      businessId: user.businessId,
      customerProgramMembership: { scanToken: data.scanToken },
    },
    include: {
      customerProgramMembership: {
        include: {
          loyaltyProgram: true,
          businessCustomerMembership: {
            include: {
              globalCustomer: true,
              createdBranch: true,
            },
          },
        },
      },
      branch: true,
      issuedByUser: true,
    },
  });

  if (!stampTransaction) fail(data.scanToken, "Stamp transaction was not found.");

  const programMembership = stampTransaction.customerProgramMembership;
  const businessMembership = programMembership.businessCustomerMembership;
  if (businessMembership.businessId !== user.businessId) fail(data.scanToken, "This loyalty QR does not belong to your business.");
  if (isOutOfAssignedBranch(user, businessMembership)) fail(data.scanToken, OUT_OF_BRANCH_ACTION_MESSAGE);
  if (stampTransaction.issuedByUserId !== user.id) fail(data.scanToken, "You can only undo your own most recent stamp.");

  const undoWindowStart = new Date(now.getTime() - STAMP_UNDO_WINDOW_MINUTES * 60 * 1000);
  if (stampTransaction.createdAt < undoWindowStart) fail(data.scanToken, "Undo window has expired. Ask a Business Owner to record a manual correction.");

  const latestStamp = await prisma.stampTransaction.findFirst({
    where: { businessId: user.businessId, customerProgramMembershipId: programMembership.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  if (latestStamp?.id !== stampTransaction.id) fail(data.scanToken, "Only the most recent stamp can be undone.");

  const laterRedemption = await prisma.rewardRedemption.findFirst({
    where: {
      businessId: user.businessId,
      customerProgramMembershipId: programMembership.id,
      redeemedAt: { gt: stampTransaction.createdAt },
    },
    select: { id: true },
  });
  if (laterRedemption) fail(data.scanToken, "This stamp cannot be undone because a reward was redeemed afterwards.");

  const laterCorrection = await prisma.auditEvent.findFirst({
    where: {
      businessId: user.businessId,
      entityType: "customer_program_membership",
      entityId: String(programMembership.id),
      action: { in: ["STAMP_UNDONE", "STAMP_MANUAL_CORRECTION"] },
      createdAt: { gt: stampTransaction.createdAt },
    },
    select: { id: true },
  });
  if (laterCorrection) fail(data.scanToken, "This stamp cannot be undone because a later correction already exists.");

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "customer_program_memberships" WHERE id = ${programMembership.id} FOR UPDATE`;
    const lockedMembership = await tx.customerProgramMembership.findUnique({
      where: { id: programMembership.id },
      include: { businessCustomerMembership: true, loyaltyProgram: true },
    });
    if (!lockedMembership) fail(data.scanToken, "Invalid or unavailable loyalty QR.");
    if (lockedMembership.businessCustomerMembership.businessId !== user.businessId) fail(data.scanToken, "This loyalty QR does not belong to your business.");
    if (isOutOfAssignedBranch(user, lockedMembership.businessCustomerMembership)) fail(data.scanToken, OUT_OF_BRANCH_ACTION_MESSAGE);

    await tx.customerProgramMembership.update({
      where: { id: programMembership.id },
      data: {
        earnedStamps: Math.max(0, lockedMembership.earnedStamps - stampTransaction.quantity),
      },
    });

    await logAuditEvent({
      tx,
      actorUserId: user.id,
      businessId: user.businessId,
      branchId: stampTransaction.branchId,
      action: "STAMP_UNDONE",
      entityType: "customer_program_membership",
      entityId: programMembership.id,
      metadata: {
        originalStampTransactionId: stampTransaction.id,
        quantity: stampTransaction.quantity,
        reason: data.reason,
        issuedByUserId: stampTransaction.issuedByUserId,
        issuedByUserName: stampTransaction.issuedByUser.name,
        customerName: `${businessMembership.globalCustomer.firstName} ${businessMembership.globalCustomer.lastName ?? ""}`.trim(),
        programName: programMembership.loyaltyProgram.name,
      },
    });
  });

  const recentUndoCount = await prisma.auditEvent.count({
    where: {
      businessId: user.businessId,
      actorUserId: user.id,
      action: "STAMP_UNDONE",
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentUndoCount >= 3) {
    await createAbuseAlert({
      businessId: user.businessId,
      branchId: stampTransaction.branchId,
      userId: user.id,
      customerProgramMembershipId: programMembership.id,
      alertType: "HIGH_STAMP_UNDO_COUNT",
      severity: "MEDIUM",
      description: `${user.name} recorded ${recentUndoCount} stamp undo corrections within 24 hours.`,
      dedupeScope: `stamp-undo:${user.id}`,
      metadata: { undoCount24h: recentUndoCount, latestReason: data.reason },
    });
  }

  undoSuccess(data.scanToken, stampTransaction.id);
}

