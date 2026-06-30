import "server-only";

import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/customer-cards";
import { logAuditEvent } from "@/lib/audit";
import { createCustomerNotification } from "@/lib/customer-notifications";
import { normalizePhone } from "@/lib/phone";

type ReferralCodeInput = {
  tx: TxClient;
  businessId: number;
  businessName: string;
  customerFirstName: string;
};

export async function generateReferralCode({ tx, businessId, businessName, customerFirstName }: ReferralCodeInput) {
  const prefix = buildBusinessPrefix(businessName);
  const customerPart = buildCustomerPart(customerFirstName);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = prefix + "-" + customerPart + randomInt(10, 100).toString();
    const existingInBusiness = await tx.businessCustomerMembership.findFirst({
      where: { businessId, referralCode: code },
      select: { id: true },
    });
    const existingGlobally = await tx.businessCustomerMembership.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existingInBusiness && !existingGlobally) return code;
  }

  throw new Error("Unable to generate a unique referral code for this business.");
}

export function buildBusinessPrefix(businessName: string) {
  const cleaned = businessName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (cleaned || "LBX").slice(0, 3).padEnd(3, "X");
}

export function buildCustomerPart(customerFirstName: string) {
  const cleaned = customerFirstName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (cleaned || "GUEST").slice(0, 10);
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
  const raw = value.trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (/^ref_[A-Za-z0-9_-]{8,}$/i.test(raw)) return raw;

  const cleaned = raw.toUpperCase();
  return /^[A-Z0-9]{3,12}-[A-Z0-9]{2,12}$/.test(cleaned) ? cleaned : null;
}

export async function getReferralUrl(referralCode: string) {
  return `${await getBaseUrl()}/referral/${encodeURIComponent(referralCode)}`;
}

export async function resolveReferralLandingReferrer(referralCode: string) {
  const directReferrer = await prisma.businessCustomerMembership.findFirst({
    where: activeReferralMembershipWhere(referralCode),
    include: referralLandingInclude(),
  });

  if (directReferrer) return directReferrer;

  const referral = await prisma.referral.findFirst({
    where: { referralCode },
    orderBy: { createdAt: "desc" },
    include: {
      referrerMembership: {
        include: referralLandingInclude(),
      },
    },
  });
  const referrer = referral?.referrerMembership;

  if (
    !referrer ||
    referrer.referralCode !== referralCode ||
    !referrer.referralEnabled ||
    referrer.status !== "ACTIVE" ||
    referrer.business.status !== "ACTIVE"
  ) {
    return null;
  }

  return referrer;
}

function activeReferralMembershipWhere(referralCode: string) {
  return {
    referralCode,
    referralEnabled: true,
    status: "ACTIVE" as const,
    business: { status: "ACTIVE" as const },
  };
}

function referralLandingInclude() {
  return {
    business: { include: { branding: true } },
    globalCustomer: true,
  };
}
type TxClient = Prisma.TransactionClient | typeof prisma;

export async function findActiveReferralReferrerByPhone({
  tx,
  businessId,
  phone,
}: {
  tx: TxClient;
  businessId: number;
  phone: string;
}) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { status: "INVALID_PHONE" as const, referrer: null };
  }

  const referrer = await tx.businessCustomerMembership.findFirst({
    where: {
      businessId,
      status: "ACTIVE",
      referralEnabled: true,
      globalCustomer: { normalizedPhone },
    },
    select: {
      id: true,
      globalCustomerId: true,
      referralCode: true,
      currentTier: true,
      globalCustomer: {
        select: {
          firstName: true,
          lastName: true,
          normalizedPhone: true,
        },
      },
    },
  });

  if (!referrer?.referralCode) {
    return { status: "NOT_FOUND" as const, referrer: null };
  }

  return { status: "FOUND" as const, referrer };
}

export async function previewActiveReferralReferrerByPhone({ businessId, phone }: { businessId: number; phone: string }) {
  return findActiveReferralReferrerByPhone({ tx: prisma, businessId, phone });
}

export type ReferralReferrerLookupMatch = {
  id: number;
  globalCustomerId: number;
  referralCode: string;
  currentTier: string;
  globalCustomer: {
    firstName: string;
    lastName: string | null;
    normalizedPhone: string;
    email: string | null;
  };
};

export async function lookupActiveReferralReferrers({
  businessId,
  query,
  limit = 5,
}: {
  businessId: number;
  query?: string | null;
  limit?: number;
}) {
  const trimmedQuery = query?.trim() ?? "";
  if (trimmedQuery.length < 2) {
    return { status: "TOO_SHORT" as const, matches: [] as ReferralReferrerLookupMatch[] };
  }

  const referralCode = extractReferralCode(trimmedQuery);
  const normalizedPhone = normalizePhone(trimmedQuery);
  const digitsOnly = trimmedQuery.replace(/\D/g, "");
  const looksLikePhone = digitsOnly.length >= 5 && /^[+\d\s().-]+$/.test(trimmedQuery);
  const take = Math.max(1, limit) + 1;
  const textFilters: Prisma.BusinessCustomerMembershipWhereInput[] = [];

  if (referralCode) {
    textFilters.push({ referralCode });
  } else if (looksLikePhone) {
    if (normalizedPhone) {
      textFilters.push({ globalCustomer: { normalizedPhone } });
    }
  } else {
    const nameParts = trimmedQuery.split(/\s+/).filter(Boolean);
    textFilters.push(
      { referralCode: { contains: trimmedQuery, mode: "insensitive" } },
      { globalCustomer: { firstName: { contains: trimmedQuery, mode: "insensitive" } } },
      { globalCustomer: { lastName: { contains: trimmedQuery, mode: "insensitive" } } },
    );
    if (nameParts.length >= 2) {
      textFilters.push({
        AND: [
          { globalCustomer: { firstName: { contains: nameParts[0], mode: "insensitive" } } },
          { globalCustomer: { lastName: { contains: nameParts.slice(1).join(" "), mode: "insensitive" } } },
        ],
      });
    }
  }

  if (textFilters.length === 0) {
    return { status: "NOT_FOUND" as const, matches: [] as ReferralReferrerLookupMatch[] };
  }

  const matches = await prisma.businessCustomerMembership.findMany({
    where: {
      businessId,
      status: "ACTIVE",
      referralEnabled: true,
      referralCode: { not: null },
      OR: textFilters,
    },
    select: {
      id: true,
      globalCustomerId: true,
      referralCode: true,
      currentTier: true,
      globalCustomer: {
        select: {
          firstName: true,
          lastName: true,
          normalizedPhone: true,
          email: true,
        },
      },
    },
    orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
    take,
  });

  const safeMatches = matches
    .filter((match): match is ReferralReferrerLookupMatch => Boolean(match.referralCode))
    .slice(0, Math.max(1, limit))
    .map((match) => ({
      ...match,
      referralCode: match.referralCode,
      currentTier: match.currentTier,
    }));

  if (safeMatches.length === 0) {
    return { status: "NOT_FOUND" as const, matches: safeMatches };
  }

  return {
    status: matches.length > 1 ? ("MULTIPLE" as const) : ("FOUND" as const),
    matches: safeMatches,
  };
}

async function findActiveReferralReferrerForEnrollment({
  tx,
  businessId,
  referralCode,
}: {
  tx: TxClient;
  businessId: number;
  referralCode: string;
}) {
  const directReferrer = await tx.businessCustomerMembership.findFirst({
    where: {
      businessId,
      referralCode,
      referralEnabled: true,
      status: "ACTIVE",
    },
    select: { id: true, globalCustomerId: true },
  });

  if (directReferrer) return directReferrer;

  const referral = await tx.referral.findFirst({
    where: { businessId, referralCode },
    orderBy: { createdAt: "desc" },
    select: {
      referrerMembership: {
        select: {
          id: true,
          globalCustomerId: true,
          referralEnabled: true,
          status: true,
          businessId: true,
        },
      },
    },
  });
  const referrer = referral?.referrerMembership;

  if (!referrer || referrer.businessId !== businessId || !referrer.referralEnabled || referrer.status !== "ACTIVE") {
    return null;
  }

  return { id: referrer.id, globalCustomerId: referrer.globalCustomerId };
}
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

  const referrer = await findActiveReferralReferrerForEnrollment({ tx, businessId, referralCode });

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
