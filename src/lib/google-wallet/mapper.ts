import "server-only";

import type {
  BusinessBranding,
  BusinessCustomerMembership,
  CustomerProgramMembership,
  LoyaltyProgram,
  ProgramReward,
} from "@prisma/client";
import { resolveWalletCardColors } from "@/lib/card-themes";
import type { CardDesignInput } from "@/lib/card-design";
import { getCardUrl, resolveBranding } from "@/lib/customer-cards";
import { progressValue } from "@/lib/programs";
import { membershipSessionSummary } from "@/lib/membership-sessions";
import { cardRewardsFor, getNextReward, getReadyRewards, type CardReward } from "@/lib/rewards";
import { getBaseUrl } from "@/lib/customer-cards";
import { stampImagePath } from "@/lib/wallet/stamp-image";
import { buildProgramPassView } from "@/lib/wallet-pass-view";
import { getScanUrl } from "@/lib/scan";
import { fromStoredTier } from "@/lib/customer-tiers";

export type GoogleWalletProgramMembership = CustomerProgramMembership & {
  businessCustomerMembership: BusinessCustomerMembership & {
    business: {
      id: number;
      name: string;
      branding: BusinessBranding | null;
      membershipSettings?: { enabled: boolean } | null;
      cashbackSettings?: { enabled: boolean; currency: string } | null;
      tierSetting?: { id: number } | null;
    };
  };
  loyaltyProgram: LoyaltyProgram & { programRewards?: ProgramReward[] };
};

/**
 * The rewards on this card. Migration 0048 backfilled a row for every program,
 * so the fallback only covers a caller that has not loaded the relation.
 */
export async function buildGoogleWalletClassPayload({
  issuerId,
  classId,
  membership,
  appUrl,
}: {
  issuerId: string;
  classId: string;
  membership: GoogleWalletProgramMembership;
  appUrl: string;
}) {
  const branding = resolveBranding(membership.businessCustomerMembership.business.branding);
  const cardDesign = membership.loyaltyProgram.cardDesign as CardDesignInput;
  // Same solid colour the Apple pass and the web card use (see resolveWalletCardColors).
  const walletColors = resolveWalletCardColors({
    cardTheme: membership.loyaltyProgram.cardTheme,
    branding,
    cardDesign,
  });
  const businessName = membership.businessCustomerMembership.business.name;
  const isMembership = membership.loyaltyProgram.isMembership;

  // The wallet always shows the same fields (the Design Studio no longer offers
  // per-section toggles: Apple has no equivalent, so they could not match).
  const classTextModules = [
    // The class is shared by every customer on the program, so it can only
    // describe the card itself - the per-customer "next reward" lives on the
    // object below. A membership has no reward to earn, so it describes the
    // package instead.
    ...(isMembership
      ? [{ id: "membership", header: "Membership", body: membershipClassBody(membership) }]
      : [{ id: "reward", header: "Reward", body: rewardBoxBody(membership) }]),
    { id: "business", header: "Business", body: businessName },
  ];

  return compactObject({
    id: classId,
    issuerName: businessName,
    programName: membership.loyaltyProgram.name,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: walletColors.background,
    programLogo: imageModule(absoluteUrl(branding.logoUrl, appUrl) ?? `${appUrl}/logo.png`, `${businessName} logo`),
    // No heroImage on the class. The per-customer stamp picture is set on the
    // object instead, and a class hero would show through for anyone missing one.
    localizedIssuerName: localizedString(businessName),
    localizedProgramName: localizedString(membership.loyaltyProgram.name),
    linksModuleData: {
      uris: [
        {
          uri: `${appUrl}/support`,
          description: "Get support",
        },
      ],
    },
    textModulesData: classTextModules.length ? classTextModules : undefined,
    issuerId,
  });
}

export async function buildGoogleWalletObjectPayload({
  classId,
  objectId,
  accountId,
  membership,
}: {
  classId: string;
  objectId: string;
  accountId: string;
  membership: GoogleWalletProgramMembership;
}) {
  const customer = membership.businessCustomerMembership;
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const progress = progressValue(membership.earnedStamps, membership.bonusStamps);
  const required = Math.max(1, membership.loyaltyProgram.requiredStamps);
  // A prepaid membership pass counts DOWN: it is issued full and each visit uses
  // a session. The "filled" count is the sessions remaining, not collected.
  const isMembership = membership.loyaltyProgram.isMembership;
  const membershipSummary = isMembership
    ? membershipSessionSummary({
        requiredStamps: membership.loyaltyProgram.requiredStamps,
        earnedStamps: membership.earnedStamps,
        bonusStamps: membership.bonusStamps,
        sessionsForfeited: membership.sessionsForfeited,
      })
    : null;
  const sessionsRemaining = membershipSummary?.remaining ?? 0;
  const sessionsTotal = membershipSummary?.total ?? required;
  const cardRewards = cardRewardsFor(membership.loyaltyProgram);
  const cardInput = {
    earnedStamps: membership.earnedStamps,
    bonusStamps: membership.bonusStamps,
    rewards: cardRewards,
    claimedRewardStamps: membership.claimedRewardStamps,
  };
  // What the customer is actually working toward. On a nine-slot card with a
  // milestone at five, someone on visit 2 is three away from the discount -
  // telling them they are seven away from the wash is what makes a milestone
  // invisible, and an invisible milestone retains nobody.
  const readyRewards = getReadyRewards(cardInput);
  const nextReward = getNextReward(cardInput);
  const rewardReady = readyRewards.length > 0;
  const remaining = nextReward ? Math.max(0, nextReward.atStamp - progress) : 0;
  const cardUrl = await getCardUrl(customer.cardToken);
  const scanUrl = await getScanUrl(membership.scanToken);
  const objectTextModules = [
    { id: "customer", header: "Customer", body: customerName },
    { id: "program", header: "Program", body: membership.loyaltyProgram.name },
    ...(!isMembership && customer.business.tierSetting
      ? [{ id: "tier", header: "Tier", body: fromStoredTier(customer.currentTier as Parameters<typeof fromStoredTier>[0]) ?? "Bronze" }]
      : []),
    ...(!isMembership
      ? [
          {
            id: "reward",
            header: rewardReady ? "Reward ready" : "Next reward",
            body: rewardReady
              // More than one can be waiting - a customer who never claimed the
              // milestone and then finished the card has both, and the pass
              // should say so rather than name one and hide the other.
              ? readyRewards.map((reward) => reward.rewardName).join(" and ") + " ready to redeem."
              : nextReward
                ? `${remaining} visit${remaining === 1 ? "" : "s"} until ${nextReward.rewardName}.`
                : "All rewards on this card have been claimed.",
          },
        ]
      : []),
  ];

  // The picture, the point rows and the colour come from the shared pass view -
  // the same one the Apple pass, the web card and the Design Studio preview use.
  // PHOTO falls back to the stamps when no photo has been uploaded, so the slot
  // is never left empty. The hero belongs on the object, not the class: a class
  // is shared by every customer, so a hero there would show one person's
  // progress to all of them.
  const baseUrl = await getBaseUrl();
  const program = membership.loyaltyProgram;
  const view = buildProgramPassView({
    businessName: customer.business.name,
    logoUrl: null,
    branding: resolveBranding(customer.business.branding),
    program: {
      name: program.name,
      isMembership,
      requiredStamps: program.requiredStamps,
      cardTheme: program.cardTheme,
      cardDesign: program.cardDesign,
      walletHeroStyle: program.walletHeroStyle,
      photoUrl: absoluteUrl(program.walletPhotoUrl, baseUrl),
    },
    customerName,
    progress,
    membership: isMembership ? { remaining: sessionsRemaining, total: sessionsTotal } : null,
    reward: { ready: rewardReady, visitsToNext: nextReward ? remaining : null },
  });
  const stampImage =
    view.banner?.kind === "photo"
      ? imageModule(view.banner.url, `${program.name} card picture`)
      : view.banner?.kind === "stamps"
        ? imageModule(
            `${baseUrl}${stampImagePath(program.uuid, view.banner.filled, view.banner.total, view.banner.emoji)}`,
            isMembership
              ? `${sessionsRemaining} of ${sessionsTotal} visits remaining`
              : `${Math.min(progress, required)} of ${required} stamps collected`,
          )
        : undefined;

  return compactObject({
    id: objectId,
    classId,
    heroImage: stampImage,
    state: membership.scanStatus === "ACTIVE" && membership.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    accountId,
    accountName: customerName,
    loyaltyPoints: { label: view.google.primary.label, balance: { string: view.google.primary.value } },
    // The program card is single-purpose now; cashback is its own wallet card.
    secondaryLoyaltyPoints: view.google.secondary
      ? { label: view.google.secondary.label, balance: { string: view.google.secondary.value } }
      : undefined,
    barcode: {
      type: "QR_CODE",
      value: scanUrl,
      alternateText: view.barcodeAltText,
    },
    textModulesData: objectTextModules.length ? objectTextModules : undefined,
    linksModuleData: {
      uris: [
        {
          uri: cardUrl,
          description: "Open loyalty card",
        },
      ],
    },
  });
}

export function buildGoogleWalletClassId(issuerId: string, loyaltyProgramUuid: string) {
  return `${issuerId}.${safeIdPart(`program_${loyaltyProgramUuid}`)}`;
}

export function buildGoogleWalletObjectId(issuerId: string, membershipUuid: string) {
  return `${issuerId}.${safeIdPart(`member_${membershipUuid}`)}`;
}

export function buildGoogleWalletAccountId(membership: GoogleWalletProgramMembership) {
  return `${membership.businessCustomerMembership.uuid}:${membership.uuid}`;
}

function imageModule(uri: string, description: string) {
  return {
    sourceUri: {
      uri,
      description,
    },
    contentDescription: localizedString(description),
  };
}

function localizedString(value: string) {
  return {
    defaultValue: {
      language: "en-US",
      value,
    },
  };
}

function absoluteUrl(value: string | null | undefined, appUrl: string) {
  if (!value) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\//i.test(value)) return null;
  if (value.startsWith("/")) return `${appUrl}${value}`;
  return `${appUrl}/${value}`;
}

function safeIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)) as T;
}

/**
 * What the shared class says under "Reward".
 *
 * A class is one row per program, so it cannot name a customer's next reward.
 * When the card carries more than one it lists them in order, which is how the
 * paper card reads: the badge at slot 5 is visible from day one.
 */
/**
 * What the shared class says for a prepaid membership. A membership has no
 * reward to collect, so it names the package benefits when set, or a plain
 * description of the prepaid session card.
 */
function membershipClassBody(membership: GoogleWalletProgramMembership) {
  const benefits = (membership.loyaltyProgram.membershipBenefits ?? [])
    .map((benefit) => benefit.trim())
    .filter(Boolean);
  if (benefits.length) return benefits.join(" \u00b7 ");
  const sessions = Math.max(1, membership.loyaltyProgram.requiredStamps);
  return `Prepaid package of ${sessions} visit${sessions === 1 ? "" : "s"}.`;
}

function rewardBoxBody(membership: GoogleWalletProgramMembership) {
  const rewards = cardRewardsFor(membership.loyaltyProgram);
  if (rewards.length <= 1) return membership.loyaltyProgram.rewardName;
  return rewards.map((reward) => `Visit ${reward.atStamp}: ${reward.rewardName}`).join(" · ");
}
