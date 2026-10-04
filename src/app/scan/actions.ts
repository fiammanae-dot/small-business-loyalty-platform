"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { isOutOfAssignedBranch, requireBusinessScopedUser } from "@/lib/authz";
import { createAbuseAlert } from "@/lib/alert-engine";
import { enforceStampCooldown } from "@/lib/cooldowns";
import { validateCsrfForm } from "@/lib/csrf";
import { createCustomerNotification } from "@/lib/customer-notifications";
import { calculateCustomerTier, isTierUpgrade } from "@/lib/customer-tiers";
import { createEngagementEventIfAllowed, createProgramEngagementEvents } from "@/lib/engagement";
import { syncGoogleWalletObjectAfterLoyaltyChange } from "@/lib/google-wallet/service";
import { prisma } from "@/lib/prisma";
import { getStartingBonusStampsForEvent, progressValue } from "@/lib/programs";
import { membershipSessionSummary } from "@/lib/membership-sessions";
import { qualifyReferralFromFirstStamp } from "@/lib/referrals";
import { cardRewardsFor, getReadyRewards, isRewardReady } from "@/lib/rewards";
import { formatAed } from "@/lib/cashback";
import { CashbackError, DuplicateCashbackError, earnCashback, spendCashback } from "@/lib/cashback-ledger";

/**
 * The rewards on a program's card, read from program_rewards.
 *
 * Falls back to the single completing reward the program has always described
 * only if the table is somehow empty for this program - migration 0048
 * backfilled a row for every program, so that should never happen, but a card
 * with no rewards at all would make redemption impossible and is not worth
 * risking at the counter.
 */
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

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(token: string, message: string): never {
  redirect(`/scan/${token}?error=${encodeURIComponent(message)}`);
}

function success(token: string, transactionId: number, shareAfterStamp = false): never {
  const params = new URLSearchParams({ issued: transactionId.toString() });
  if (shareAfterStamp) params.set("share", "whatsapp");
  redirect(`/scan/${token}?${params.toString()}`);
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

  const { user } = await requireBusinessScopedUser({
    requireSubscription: true,
    requireActiveBranch: true,
    fail: (message) => fail(token, message),
  });

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
  const shareAfterStamp = getString(formData, "shareAfterStamp") === "whatsapp";
  const scannerBranch = user.branchId
    ? await prisma.branch.findFirst({
        where: { id: user.branchId, businessId: user.businessId },
        select: { id: true, name: true },
      })
    : null;

  const programMembership = await prisma.customerProgramMembership.findUnique({
    where: { scanToken: data.scanToken },
    include: {
      loyaltyProgram: {
        include: {
          programRewards: { orderBy: { atStamp: "asc" } },
          membershipTreatments: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      businessCustomerMembership: {
        include: {
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
      rewards: cardRewardsFor(programMembership.loyaltyProgram),
      claimedRewardStamps: programMembership.claimedRewardStamps,
    })
  ) {
    fail(data.scanToken, STAFF_REWARD_READY_STAMP_BLOCK_MESSAGE);
  }

  // Phase 2: a membership visit records which treatment was delivered. The
  // treatment is required for membership programs and is either a menu item
  // (membershipTreatmentId) or a free-text "Other" name captured at the counter.
  let membershipTreatmentId: number | null = null;
  let treatmentName: string | null = null;
  if (programMembership.loyaltyProgram.isMembership) {
    const sessions = membershipSessionSummary({
      requiredStamps: programMembership.loyaltyProgram.requiredStamps,
      earnedStamps: programMembership.earnedStamps,
      bonusStamps: programMembership.bonusStamps,
      sessionsForfeited: programMembership.sessionsForfeited,
    });
    if (sessions.remaining <= 0) {
      fail(data.scanToken, "This membership has no sessions left \u2014 all sessions have been used or have expired.");
    }
    if (data.quantity !== 1) {
      fail(data.scanToken, "Membership visits are recorded one treatment at a time. Set the quantity to 1.");
    }
    const treatmentChoice = getString(formData, "membershipTreatment").trim();
    const treatmentOther = getString(formData, "treatmentOther").trim();
    if (treatmentChoice === "other") {
      if (!treatmentOther) fail(data.scanToken, "Type the treatment used for this visit.");
      treatmentName = treatmentOther.slice(0, 200);
    } else if (treatmentChoice) {
      const chosen = programMembership.loyaltyProgram.membershipTreatments.find(
        (treatment) => String(treatment.id) === treatmentChoice,
      );
      if (!chosen) fail(data.scanToken, "Select a valid treatment for this visit.");
      membershipTreatmentId = chosen.id;
      treatmentName = chosen.name;
    } else {
      fail(data.scanToken, "Select the treatment for this visit.");
    }
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const customerName = `${businessMembership.firstName} ${businessMembership.lastName ?? ""}`.trim();
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
    success(data.scanToken, existingTransaction.id, shareAfterStamp);
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
        membershipTreatmentId,
        treatmentName,
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
      success(data.scanToken, existing.id, shareAfterStamp);
    }
    throw error;
  }

  await syncGoogleWalletObjectAfterLoyaltyChange(programMembership.id);
  success(data.scanToken, transactionId, shareAfterStamp);
}

/**
 * Renew a prepaid membership that has been used up.
 *
 * A membership is a card of prepaid sessions that counts down; when it reaches
 * zero the customer can pay for the package again. Renewing resets the card to a
 * full set of sessions and restarts the monthly use-it-or-lose-it clock from
 * today (enrolledAt + the forfeit counters), rather than issuing a second card.
 * The visit history (StampTransactions) is left in place as the audit trail.
 */
export async function renewMembershipAction(formData: FormData) {
  const scanToken = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:membership-renew");
  } catch {
    fail(scanToken, "Security check failed. Please refresh and try again.");
  }

  const { user } = await requireBusinessScopedUser({
    requireSubscription: true,
    requireActiveBranch: true,
    fail: (message) => fail(scanToken, message),
  });

  if (!scanToken) fail(scanToken, "Scan token is required.");

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
      businessCustomerMembership: { include: { createdBranch: true } },
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
  if (!programMembership.loyaltyProgram.isMembership) {
    fail(scanToken, "This program is not a membership, so it cannot be renewed.");
  }
  if (
    programMembership.scanStatus !== "ACTIVE" ||
    programMembership.status !== "ACTIVE" ||
    !programMembership.loyaltyProgram.active ||
    businessMembership.status !== "ACTIVE"
  ) {
    fail(scanToken, "Invalid or unavailable loyalty QR.");
  }

  const branchId = scannerBranch?.id ?? businessMembership.createdBranchId ?? null;
  const branchName = scannerBranch?.name ?? businessMembership.createdBranch?.name ?? "Unassigned";
  const previousSummary = membershipSessionSummary({
    requiredStamps: programMembership.loyaltyProgram.requiredStamps,
    earnedStamps: programMembership.earnedStamps,
    bonusStamps: programMembership.bonusStamps,
    sessionsForfeited: programMembership.sessionsForfeited,
  });

  await prisma.$transaction(async (tx) => {
    await tx.customerProgramMembership.update({
      where: { id: programMembership.id },
      data: {
        earnedStamps: 0,
        bonusStamps: 0,
        sessionsForfeited: 0,
        forfeitCyclesProcessed: 0,
        claimedRewardStamps: { set: [] },
        enrolledAt: new Date(),
        status: "ACTIVE",
      },
    });

    await logAuditEvent({
      tx,
      actorUserId: user.id,
      businessId: user.businessId as number,
      action: "MEMBERSHIP_RENEWED",
      entityType: "customer_program_membership",
      entityId: programMembership.id,
      metadata: {
        programName: programMembership.loyaltyProgram.name,
        totalSessions: programMembership.loyaltyProgram.requiredStamps,
        previousRemaining: previousSummary.remaining,
        branchId,
        branchName,
      },
    });
  });

  await syncGoogleWalletObjectAfterLoyaltyChange(programMembership.id);
  redirect(`/scan/${scanToken}?renewed=1`);
}

export async function redeemRewardAction(formData: FormData) {
  const scanToken = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:redemption");
  } catch {
    fail(scanToken, "Security check failed. Please refresh and try again.");
  }

  const { user } = await requireBusinessScopedUser({
    requireSubscription: true,
    requireActiveBranch: true,
    fail: (message) => fail(scanToken, message),
  });

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
      loyaltyProgram: { include: { programRewards: { orderBy: { atStamp: "asc" } } } },
      businessCustomerMembership: {
        include: {
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
      rewards: cardRewardsFor(programMembership.loyaltyProgram),
      claimedRewardStamps: programMembership.claimedRewardStamps,
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
        loyaltyProgram: { include: { programRewards: { orderBy: { atStamp: "asc" } } } },
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
    // Which rewards this customer has reached and not yet taken, earliest
    // first. More than one can be waiting: someone who never claimed the
    // visit-5 discount and then reaches visit 9 has both.
    const readyRewards = getReadyRewards({
      earnedStamps: lockedMembership.earnedStamps,
      bonusStamps: lockedMembership.bonusStamps,
      rewards: cardRewardsFor(lockedMembership.loyaltyProgram),
      claimedRewardStamps: lockedMembership.claimedRewardStamps,
    });
    if (readyRewards.length === 0) {
      fail(scanToken, "Reward is not ready yet.");
    }

    // Always redeem the EARLIEST ready reward. That single rule is what stops
    // an unclaimed milestone being destroyed: the card can only reset once the
    // completing reward is the earliest thing still owed, so a customer sitting
    // at visit 9 with the visit-5 discount outstanding collects the discount
    // first and the wash on the next scan. Nothing is silently lost, and staff
    // never have to notice.
    const claimed = readyRewards[0];

    // program_rewards rows are ordered and matched by atStamp, so this finds
    // the row backing the reward the engine chose.
    const claimedRow = lockedMembership.loyaltyProgram.programRewards.find(
      (reward) => reward.atStamp === claimed.atStamp,
    );

    const created = await tx.rewardRedemption.create({
      data: {
        businessId: user.businessId as number,
        branchId,
        customerProgramMembershipId: programMembership.id,
        loyaltyProgramId: lockedMembership.loyaltyProgramId,
        programRewardId: claimedRow?.id ?? null,
        // The reward as it was named at the moment it was given, not as the
        // program describes it today.
        rewardName: claimed.rewardName,
        requiredStamps: claimed.atStamp,
        redeemedByUserId: user.id,
        redeemedAt: now,
        idempotencyKey,
        notes: notes || null,
      },
      select: { id: true },
    });

    if (claimed.completesCard) {
      // The card is finished: stamps go back to the starting position and the
      // claimed set empties, so every milestone is available again next time
      // round.
      await tx.customerProgramMembership.update({
        where: { id: programMembership.id },
        data: {
          earnedStamps: 0,
          claimedRewardStamps: [],
          bonusStamps: getStartingBonusStampsForEvent({
            startingBonusStamps: lockedMembership.loyaltyProgram.startingBonusStamps,
            startingStampPolicy: lockedMembership.loyaltyProgram.startingStampPolicy,
            event: "CARD_RESET",
          }),
        },
      });
    } else {
      // A milestone. The customer collects it and keeps the stamps they have -
      // this is the whole point of a reward before the card is full.
      await tx.customerProgramMembership.update({
        where: { id: programMembership.id },
        data: {
          claimedRewardStamps: { push: claimed.atStamp },
        },
      });
    }

    await createEngagementEventIfAllowed({
      tx,
      businessId: user.businessId as number,
      customerId: lockedMembership.businessCustomerMembershipId,
      eventType: "REWARD_REDEEMED",
      metadata: {
        programMembershipId: lockedMembership.id,
        programName: lockedMembership.loyaltyProgram.name,
        rewardName: claimed.rewardName,
        completedCard: claimed.completesCard,
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

  await syncGoogleWalletObjectAfterLoyaltyChange(programMembership.id);
  redemptionSuccess(scanToken, redemption.id);
}

export async function undoStampAction(formData: FormData) {
  const scanToken = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:stamp-undo");
  } catch {
    fail(scanToken, "Security check failed. Please refresh and try again.");
  }

  const { user } = await requireBusinessScopedUser({
    requireSubscription: true,
    requireActiveBranch: true,
    fail: (message) => fail(scanToken, message),
  });

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
        customerName: `${businessMembership.firstName} ${businessMembership.lastName ?? ""}`.trim(),
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

  await syncGoogleWalletObjectAfterLoyaltyChange(programMembership.id);
  undoSuccess(data.scanToken, stampTransaction.id);
}


// ---------------------------------------------------------------------------
// Cashback wallet at the counter (Phase 4.1)
//
// Staff-facing add + spend from the scan page. These run under the scan-flow
// guard (requireBusinessScopedUser: a logged-in, branch-scoped staff/manager/
// owner), verify the QR belongs to the business and the staffer's branch, then
// delegate the money movement to @/lib/cashback-ledger - the SAME audited,
// atomic, idempotent, capped path the owner dashboard uses. Spend is gated by a
// confirmation in the UI; every movement is attributable via the ledger + audit.
// ---------------------------------------------------------------------------

const scanCashbackAddSchema = z.object({
  scanToken: z.string().trim().min(1, "Scan token is required."),
  billAmount: z.coerce
    .number({ error: "Enter the amount paid." })
    .positive("Amount paid must be greater than zero.")
    .max(1_000_000, "Amount paid is too large."),
  invoiceNumber: z
    .string({ error: "Enter the invoice number." })
    .trim()
    .min(1, "Enter the invoice number.")
    .max(64, "Invoice number is too long."),
  idempotencyKey: z.string().trim().min(16, "Security token is required."),
});

const scanCashbackSpendSchema = z.object({
  scanToken: z.string().trim().min(1, "Scan token is required."),
  amount: z.coerce
    .number({ error: "Enter an amount to use." })
    .positive("Amount must be greater than zero.")
    .max(1_000_000, "Amount is too large."),
  idempotencyKey: z.string().trim().min(16, "Security token is required."),
});

function cashbackSuccess(token: string, message: string): never {
  redirect(`/scan/${token}?cashback=${encodeURIComponent(message)}`);
}

async function resolveScanCashback(
  scanToken: string,
  user: { businessId: number; role: string; branchId?: number | null },
) {
  const programMembership = await prisma.customerProgramMembership.findUnique({
    where: { scanToken },
    select: {
      businessCustomerMembership: {
        select: { id: true, businessId: true, createdBranchId: true },
      },
    },
  });
  if (!programMembership) fail(scanToken, "Invalid or unavailable loyalty QR.");
  const membership = programMembership.businessCustomerMembership;
  if (membership.businessId !== user.businessId) {
    fail(scanToken, "This loyalty QR does not belong to your business.");
  }
  if (isOutOfAssignedBranch(user, membership)) {
    fail(scanToken, OUT_OF_BRANCH_ACTION_MESSAGE);
  }

  const settings = await prisma.businessCashbackSettings.findUnique({
    where: { businessId: user.businessId },
    select: { enabled: true, ratePercent: true, currency: true, maxBillAmount: true, maxRedemption: true },
  });
  if (!settings?.enabled) fail(scanToken, "Cashback is not enabled for this business.");

  return { membership, settings };
}

export async function addCashbackFromScanAction(formData: FormData) {
  const token = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:cashback-add");
  } catch {
    fail(token, "Security check failed. Please refresh and try again.");
  }

  const { user } = await requireBusinessScopedUser({
    requireSubscription: true,
    requireActiveBranch: true,
    fail: (message) => fail(token, message),
  });

  const parsed = scanCashbackAddSchema.safeParse({
    scanToken: getString(formData, "scanToken"),
    billAmount: getString(formData, "billAmount"),
    invoiceNumber: getString(formData, "invoiceNumber"),
    idempotencyKey: getString(formData, "idempotencyKey"),
  });
  if (!parsed.success) fail(token, parsed.error.issues[0]?.message ?? "Validation failed.");
  const data = parsed.data;

  const { membership, settings } = await resolveScanCashback(data.scanToken, user);

  let earned: number;
  try {
    const result = await earnCashback({
      businessId: user.businessId,
      membershipId: membership.id,
      branchId: membership.createdBranchId,
      actorUserId: user.id,
      billAmount: data.billAmount,
      invoiceNumber: data.invoiceNumber,
      ratePercent: Number(settings.ratePercent),
      currency: settings.currency,
      maxBillAmount: settings.maxBillAmount != null ? Number(settings.maxBillAmount) : null,
      idempotencyKey: data.idempotencyKey,
    });
    earned = result.amount;
  } catch (error) {
    if (error instanceof DuplicateCashbackError) cashbackSuccess(data.scanToken, "Cashback already added.");
    if (error instanceof CashbackError) fail(data.scanToken, error.message);
    throw error;
  }

  cashbackSuccess(data.scanToken, `Added ${formatAed(earned, settings.currency)} cashback.`);
}

export async function useCashbackFromScanAction(formData: FormData) {
  const token = getString(formData, "scanToken");
  try {
    validateCsrfForm(formData, "scan:cashback-spend");
  } catch {
    fail(token, "Security check failed. Please refresh and try again.");
  }

  const { user } = await requireBusinessScopedUser({
    requireSubscription: true,
    requireActiveBranch: true,
    fail: (message) => fail(token, message),
  });

  const parsed = scanCashbackSpendSchema.safeParse({
    scanToken: getString(formData, "scanToken"),
    amount: getString(formData, "amount"),
    idempotencyKey: getString(formData, "idempotencyKey"),
  });
  if (!parsed.success) fail(token, parsed.error.issues[0]?.message ?? "Validation failed.");
  const data = parsed.data;

  const { membership, settings } = await resolveScanCashback(data.scanToken, user);

  try {
    await spendCashback({
      businessId: user.businessId,
      membershipId: membership.id,
      branchId: membership.createdBranchId,
      actorUserId: user.id,
      amount: data.amount,
      currency: settings.currency,
      maxRedemption: settings.maxRedemption != null ? Number(settings.maxRedemption) : null,
      idempotencyKey: data.idempotencyKey,
    });
  } catch (error) {
    if (error instanceof DuplicateCashbackError) cashbackSuccess(data.scanToken, "Cashback already used.");
    if (error instanceof CashbackError) fail(data.scanToken, error.message);
    throw error;
  }

  cashbackSuccess(data.scanToken, `Used ${formatAed(data.amount, settings.currency)} cashback.`);
}
