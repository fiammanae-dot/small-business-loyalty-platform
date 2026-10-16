import "server-only";

import { randomInt } from "crypto";
import type { CustomerTierName, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/customer-cards";
import { logAuditEvent } from "@/lib/audit";
import { createAbuseAlert, getAlertRule } from "@/lib/alert-engine";
import { createCustomerNotification } from "@/lib/customer-notifications";
import { normalizePhone } from "@/lib/phone";
import { generateScanToken } from "@/lib/scan";
import { toView } from "@/lib/referral-settings-rules";

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
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "https://app.loyaltycarduae.invalid");
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
      normalizedPhone,
    },
    select: {
      id: true,
      globalCustomerId: true,
      referralCode: true,
      currentTier: true,
      firstName: true,
      lastName: true,
      normalizedPhone: true,
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
  currentTier: CustomerTierName;
  firstName: string;
  lastName: string | null;
  normalizedPhone: string;
  email: string | null;
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
      textFilters.push({ normalizedPhone });
    }
  } else {
    const nameParts = trimmedQuery.split(/\s+/).filter(Boolean);
    textFilters.push(
      { referralCode: { contains: trimmedQuery, mode: "insensitive" } },
      { firstName: { contains: trimmedQuery, mode: "insensitive" } },
      { lastName: { contains: trimmedQuery, mode: "insensitive" } },
    );
    if (nameParts.length >= 2) {
      textFilters.push({
        AND: [
          { firstName: { contains: nameParts[0], mode: "insensitive" } },
          { lastName: { contains: nameParts.slice(1).join(" "), mode: "insensitive" } },
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
      firstName: true,
      lastName: true,
      normalizedPhone: true,
      email: true,
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

  // Referral volume alert: one customer bringing in many new customers in 24 hours.
  const volumeRule = await getAlertRule(tx, businessId, "REFERRAL_ABUSE_THRESHOLD");
  if (volumeRule.enabled) {
    const referralsIn24h = await tx.referral.count({
      where: { businessId, referrerMembershipId: referrer.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (referralsIn24h >= volumeRule.threshold) {
      const referrerName = await tx.businessCustomerMembership.findUnique({
        where: { id: referrer.id },
        select: { firstName: true, lastName: true },
      });
      const name = referrerName ? `${referrerName.firstName} ${referrerName.lastName ?? ""}`.trim() : "A customer";
      await createAbuseAlert({
        tx,
        businessId,
        alertType: "REFERRAL_HIGH_VOLUME",
        severity: volumeRule.severity,
        description: `${name} referred ${referralsIn24h} new customers in 24 hours (your limit is ${volumeRule.threshold}). Check they are real people before rewards are given.`,
        dedupeScope: `referrer:${referrer.id}`,
        metadata: { referrerMembershipId: referrer.id, referralsIn24h, threshold: volumeRule.threshold },
      });
    }
  }
}

type ReferralActivity =
  | { kind: "STAMP"; stampTransactionId: number; loyaltyProgramId: number }
  | { kind: "CASHBACK"; cashbackTransactionId: number };

/**
 * A referred friend's FIRST activity of any kind (a stamp or package visit in
 * any program, or a cashback purchase) qualifies their referral. The reward is
 * the business's one referral reward (see referral-settings.ts), paid whatever
 * program the first activity was in: bonus stamps on the chosen stamp card
 * (the referrer and friend are enrolled in it if needed; never a package), or
 * cashback into the cashback balance. Runs inside the scan/earn transaction.
 *
 * Returns the memberships whose cashback balance changed, so the caller can
 * refresh their wallet cards after the transaction commits.
 */
export async function qualifyReferral({
  tx,
  businessId,
  referredMembershipId,
  activity,
  branchId,
  currency,
  now,
}: {
  tx: TxClient;
  businessId: number;
  referredMembershipId: number;
  activity: ReferralActivity;
  branchId: number | null;
  currency: string;
  now: Date;
}): Promise<{ cashbackMembershipIds: number[] }> {
  const none = { cashbackMembershipIds: [] as number[] };
  const referral = await tx.referral.findFirst({
    where: { businessId, referredMembershipId, status: "PENDING" },
    select: { id: true, referrerMembershipId: true },
  });
  if (!referral) return none;

  // Only the friend's first activity counts.
  if (activity.kind === "STAMP") {
    const previous = await tx.stampTransaction.aggregate({
      where: { businessId, customerProgramMembership: { businessCustomerMembershipId: referredMembershipId }, id: { not: activity.stampTransactionId } },
      _sum: { quantity: true },
    });
    if ((previous._sum.quantity ?? 0) > 0) return none;
  } else {
    const earlier = await tx.cashbackTransaction.count({
      where: { businessId, businessCustomerMembershipId: referredMembershipId, type: "EARN", id: { not: activity.cashbackTransactionId } },
    });
    if (earlier > 0) return none;
  }

  await tx.referral.update({
    where: { id: referral.id },
    data: {
      status: "QUALIFIED",
      qualifiedAt: now,
      ...(activity.kind === "STAMP" ? { firstStampTransactionId: activity.stampTransactionId, referredFirstStampBranchId: branchId } : {}),
    },
  });
  const via = activity.kind === "STAMP" ? { via: "STAMP", loyaltyProgramId: activity.loyaltyProgramId, stampTransactionId: activity.stampTransactionId } : { via: "CASHBACK", cashbackTransactionId: activity.cashbackTransactionId };
  await logAuditEvent({ tx, businessId, branchId, action: "REFERRAL_QUALIFIED", entityType: "referral", entityId: referral.id, metadata: { ...via, referredMembershipId } });
  await tx.referralEvent.create({ data: { businessId, referralId: referral.id, eventType: "REFERRAL_QUALIFIED", metadata: { ...via, branchId } } });

  const settingsRow = await tx.businessReferralSettings.findUnique({
    where: { businessId },
    include: { stampProgram: { select: { id: true, name: true, active: true, isMembership: true, startingBonusStamps: true, startingStampPolicy: true, rewardName: true } } },
  });
  const settings = toView(settingsRow);

  if (settings.rewardType === "STAMPS" && settingsRow?.stampProgram) {
    const program = settingsRow.stampProgram;
    const grants: Array<{ membershipId: number; stamps: number; who: "referrer" | "friend" }> = [
      { membershipId: referral.referrerMembershipId, stamps: settings.referrerStamps, who: "referrer" },
      { membershipId: referredMembershipId, stamps: settings.friendStamps, who: "friend" },
    ];
    for (const grant of grants) {
      if (grant.stamps <= 0) continue;
      const programMembershipId = await ensureProgramMembership({ tx, businessId, membershipId: grant.membershipId, program });
      if (!programMembershipId) continue;
      await tx.customerProgramMembership.update({ where: { id: programMembershipId }, data: { bonusStamps: { increment: grant.stamps } } });
      if (grant.who === "referrer") {
        await tx.referralReward.create({
          data: { businessId, referralId: referral.id, loyaltyProgramId: program.id, referrerProgramMembershipId: programMembershipId, bonusStamps: grant.stamps, status: "GRANTED", grantedAt: now },
        });
      }
      await tx.referralEvent.create({
        data: {
          businessId,
          referralId: referral.id,
          eventType: "REWARD_GRANTED",
          metadata: { to: grant.who, loyaltyProgramId: program.id, loyaltyProgramName: program.name, bonusStamps: grant.stamps, programMembershipId },
        },
      });
      await createCustomerNotification({
        tx,
        businessId,
        customerId: grant.membershipId,
        notificationType: "REFERRAL_REWARD_EARNED",
        metadata: { loyaltyProgramId: program.id, loyaltyProgramName: program.name, bonus_stamps: grant.stamps, bonus_plural: grant.stamps === 1 ? "" : "s" },
      });
      await logAuditEvent({
        tx,
        businessId,
        branchId,
        action: "REFERRAL_REWARD_GRANTED",
        entityType: "referral_reward",
        entityId: referral.id,
        metadata: { to: grant.who, loyaltyProgramId: program.id, bonusStamps: grant.stamps, programMembershipId },
      });
    }
    return none;
  }

  if (settings.rewardType === "CASHBACK") {
    const cashback = await tx.businessCashbackSettings.findUnique({ where: { businessId }, select: { enabled: true } });
    if (!cashback?.enabled) {
      await tx.referralEvent.create({ data: { businessId, referralId: referral.id, eventType: "REWARD_PENDING", metadata: { reason: "Cashback is switched off." } } });
      return none;
    }
    const paid: number[] = [];
    for (const grant of [
      { membershipId: referral.referrerMembershipId, amount: settings.referrerCashback, who: "referrer" as const },
      { membershipId: referredMembershipId, amount: settings.friendCashback, who: "friend" as const },
    ]) {
      if (!(grant.amount > 0)) continue;
      const rowId = await payReferralCashback({ tx, businessId, membershipId: grant.membershipId, amount: grant.amount, branchId, currency, now });
      if (!rowId) continue;
      paid.push(grant.membershipId);
      await tx.referralEvent.create({
        data: { businessId, referralId: referral.id, eventType: "REWARD_GRANTED", metadata: { to: grant.who, via: "CASHBACK", cashbackAmount: grant.amount, currency, cashbackTransactionId: rowId } },
      });
      await logAuditEvent({
        tx,
        businessId,
        branchId,
        action: "REFERRAL_REWARD_GRANTED",
        entityType: "cashback_transaction",
        entityId: rowId,
        metadata: { to: grant.who, referralId: referral.id, cashbackAmount: grant.amount },
      });
    }
    return { cashbackMembershipIds: paid };
  }

  await tx.referralEvent.create({ data: { businessId, referralId: referral.id, eventType: "REWARD_PENDING", metadata: { reason: "No referral reward set up." } } });
  return none;
}

/** The customer's membership in the reward's stamp program, enrolling them if they are not in it yet. */
async function ensureProgramMembership({
  tx,
  businessId,
  membershipId,
  program,
}: {
  tx: TxClient;
  businessId: number;
  membershipId: number;
  program: { id: number; startingBonusStamps: number; startingStampPolicy: "NEVER" | "FIRST_ENROLLMENT_ONLY" | "EVERY_COMPLETED_CARD" };
}): Promise<number | null> {
  const membership = await tx.businessCustomerMembership.findFirst({ where: { id: membershipId, businessId, status: "ACTIVE" }, select: { id: true } });
  if (!membership) return null;
  const existing = await tx.customerProgramMembership.findFirst({ where: { businessCustomerMembershipId: membershipId, loyaltyProgramId: program.id }, select: { id: true, status: true } });
  if (existing) return existing.status === "ACTIVE" ? existing.id : null;
  const created = await tx.customerProgramMembership.create({
    data: {
      businessCustomerMembershipId: membershipId,
      loyaltyProgramId: program.id,
      earnedStamps: 0,
      // Starting stamps only when the policy gives them on first enrolment.
      bonusStamps: program.startingStampPolicy === "NEVER" ? 0 : Math.max(0, program.startingBonusStamps),
      enrollmentSource: "OWNER",
      status: "ACTIVE",
      scanToken: generateScanToken(),
      scanStatus: "ACTIVE",
      scanCreatedAt: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

/** Credits cashback to a member under their own row lock; joins them to cashback if needed. Returns the transaction id. */
async function payReferralCashback({
  tx,
  businessId,
  membershipId,
  amount,
  branchId,
  currency,
  now,
}: {
  tx: TxClient;
  businessId: number;
  membershipId: number;
  amount: number;
  branchId: number | null;
  currency: string;
  now: Date;
}): Promise<number | null> {
  await tx.$queryRaw`SELECT id FROM "business_customer_memberships" WHERE id = ${membershipId} FOR UPDATE`;
  const member = await tx.businessCustomerMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, businessId: true, status: true, cashbackBalance: true, cashbackJoinedAt: true },
  });
  if (!member || member.businessId !== businessId || member.status !== "ACTIVE") return null;
  const balanceAfter = Math.round((Number(member.cashbackBalance) + amount) * 100) / 100;
  await tx.businessCustomerMembership.update({
    where: { id: member.id },
    data: { cashbackBalance: balanceAfter, ...(member.cashbackJoinedAt ? {} : { cashbackJoinedAt: now }) },
  });
  const row = await tx.cashbackTransaction.create({
    data: { businessId, businessCustomerMembershipId: member.id, branchId, type: "EARN", amount, balanceAfter, currency, note: "Referral reward" },
    select: { id: true },
  });
  return row.id;
}
