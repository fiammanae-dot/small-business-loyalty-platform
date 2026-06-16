import "server-only";

import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { getBaseUrl } from "@/lib/customer-cards";
import { logAuditEvent } from "@/lib/audit";
import { createCustomerNotification } from "@/lib/customer-notifications";

export function generateReferralCode() {
  return `ref_${randomBytes(18).toString("base64url")}`;
}

export function extractReferralCode(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "https://app.loyaltybase.invalid");
    const segments = url.pathname.split("/").filter(Boolean);
    const referralIndex = segments.findIndex((segment) => segment === "referral" || segment === "r");
    if (referralIndex >= 0 && segments[referralIndex + 1]) return cleanReferralCode(segments[referralIndex + 1]);
    const queryCode = url.searchParams.get("ref");
    if (queryCode) return cleanReferralCode(queryCode);
  } catch {
    // Fall through to direct token parsing.
  }

  return cleanReferralCode(trimmed);
}

function cleanReferralCode(value: string) {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_-]/g, "");
  return cleaned.startsWith("ref_") && cleaned.length >= 8 ? cleaned : null;
}

export async function getReferralUrl(referralCode: string) {
  return `${await getBaseUrl()}/referral/${encodeURIComponent(referralCode)}`;
}

type TxClient = Prisma.TransactionClient;

export async function createPendingReferralForEnrollment({
  tx,
  businessId,
  referredGlobalCustomerId,
  referredMembershipId,
  referralCode,
}: {
  tx: TxClient;
  businessId: number;
  referredGlobalCustomerId: number;
  referredMembershipId: number;
  referralCode: string | null;
}) {
  if (!referralCode) return;

  const referrer = await tx.businessCustomerMembership.findFirst({
    where: {
      businessId,
      referralCode,
      referralEnabled: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      globalCustomerId: true,
    },
  });

  if (!referrer) return;

  const existing = await tx.referral.findUnique({
    where: {
      businessId_referredMembershipId: {
        businessId,
        referredMembershipId,
      },
    },
    select: { id: true },
  });
  if (existing) return;

  const isSelfReferral = referrer.globalCustomerId === referredGlobalCustomerId || referrer.id === referredMembershipId;
  const referral = await tx.referral.create({
    data: {
      businessId,
      referrerMembershipId: referrer.id,
      referredGlobalCustomerId,
      referredMembershipId,
      referralCode,
      status: isSelfReferral ? "REJECTED" : "PENDING",
      source: "LINK",
      rejectionReason: isSelfReferral ? "Self-referrals are blocked." : null,
    },
    select: { id: true },
  });

  await tx.referralEvent.create({
    data: {
      businessId,
      referralId: referral.id,
      eventType: isSelfReferral ? "SELF_REFERRAL_BLOCKED" : "REFERRAL_CREATED",
      metadata: {
        referredMembershipId,
        referredGlobalCustomerId,
        referralCode,
      },
    },
  });
}

export async function qualifyReferralFromFirstStamp({
  tx,
  businessId,
  referredMembershipId,
  loyaltyProgramId,
  stampTransactionId,
  branchId,
  now,
}: {
  tx: TxClient;
  businessId: number;
  referredMembershipId: number;
  loyaltyProgramId: number;
  stampTransactionId: number;
  branchId: number | null;
  now: Date;
}) {
  const referral = await tx.referral.findFirst({
    where: {
      businessId,
      referredMembershipId,
      status: "PENDING",
    },
    select: {
      id: true,
      referrerMembershipId: true,
      referralCode: true,
    },
  });

  if (!referral) return;

  const previousStamps = await tx.stampTransaction.aggregate({
    where: {
      businessId,
      customerProgramMembership: {
        businessCustomerMembershipId: referredMembershipId,
      },
      id: { not: stampTransactionId },
    },
    _sum: { quantity: true },
  });

  if ((previousStamps._sum.quantity ?? 0) > 0) return;

  const program = await tx.loyaltyProgram.findFirst({
    where: { id: loyaltyProgramId, businessId },
    select: { id: true, name: true, referralRewardBonusStamps: true },
  });
  if (!program) return;

  await tx.referral.update({
    where: { id: referral.id },
    data: {
      status: "QUALIFIED",
      firstStampTransactionId: stampTransactionId,
      referredFirstStampBranchId: branchId,
      qualifiedAt: now,
    },
  });
  await logAuditEvent({
    tx,
    businessId,
    branchId,
    action: "REFERRAL_QUALIFIED",
    entityType: "referral",
    entityId: referral.id,
    metadata: {
      loyaltyProgramId,
      stampTransactionId,
      referredMembershipId,
    },
  });

  await tx.referralEvent.create({
    data: {
      businessId,
      referralId: referral.id,
      eventType: "REFERRAL_QUALIFIED",
      metadata: {
        loyaltyProgramId,
        loyaltyProgramName: program.name,
        stampTransactionId,
        branchId,
      },
    },
  });

  const bonusStamps = Math.max(0, program.referralRewardBonusStamps);
  const referrerProgramMembership = await tx.customerProgramMembership.findFirst({
    where: {
      businessCustomerMembershipId: referral.referrerMembershipId,
      loyaltyProgramId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (bonusStamps > 0 && referrerProgramMembership) {
    await tx.customerProgramMembership.update({
      where: { id: referrerProgramMembership.id },
      data: { bonusStamps: { increment: bonusStamps } },
    });

    await tx.referralReward.create({
      data: {
        businessId,
        referralId: referral.id,
        loyaltyProgramId,
        referrerProgramMembershipId: referrerProgramMembership.id,
        bonusStamps,
        status: "GRANTED",
        grantedAt: now,
      },
    });

    await tx.referralEvent.create({
      data: {
        businessId,
        referralId: referral.id,
        eventType: "REWARD_GRANTED",
        metadata: {
          loyaltyProgramId,
          loyaltyProgramName: program.name,
          bonusStamps,
          referrerProgramMembershipId: referrerProgramMembership.id,
        },
      },
    });
    await createCustomerNotification({
      tx,
      businessId,
      customerId: referral.referrerMembershipId,
      notificationType: "REFERRAL_REWARD_EARNED",
      metadata: {
        loyaltyProgramId,
        loyaltyProgramName: program.name,
        bonus_stamps: bonusStamps,
        bonus_plural: bonusStamps === 1 ? "" : "s",
      },
    });
    await logAuditEvent({
      tx,
      businessId,
      branchId,
      action: "REFERRAL_REWARD_GRANTED",
      entityType: "referral_reward",
      entityId: referral.id,
      metadata: {
        loyaltyProgramId,
        bonusStamps,
        referrerProgramMembershipId: referrerProgramMembership.id,
      },
    });
  } else {
    await tx.referralReward.create({
      data: {
        businessId,
        referralId: referral.id,
        loyaltyProgramId,
        referrerProgramMembershipId: referrerProgramMembership?.id ?? null,
        bonusStamps,
        status: "PENDING",
        grantedAt: null,
      },
    });

    await tx.referralEvent.create({
      data: {
        businessId,
        referralId: referral.id,
        eventType: "REWARD_PENDING",
        metadata: {
          loyaltyProgramId,
          loyaltyProgramName: program.name,
          reason: referrerProgramMembership ? "No bonus stamps configured." : "Referrer is not enrolled in this program.",
        },
      },
    });
  }
}
