import "server-only";

import type {
  BusinessBranding,
  BusinessCustomerMembership,
  CustomerProgramMembership,
  LoyaltyProgram,
  ProgramReward,
} from "@prisma/client";
import { resolveCardThemeColors } from "@/lib/card-themes";
import { resolveCardDesign, type CardDesignInput } from "@/lib/card-design";
import { getCardUrl, resolveBranding } from "@/lib/customer-cards";
import { progressValue } from "@/lib/programs";
import { cardRewardsFor, getNextReward, getReadyRewards, type CardReward } from "@/lib/rewards";
import { getBaseUrl } from "@/lib/customer-cards";
import { stampImagePath } from "@/lib/wallet/stamp-image";
import { getScanUrl } from "@/lib/scan";

export type GoogleWalletProgramMembership = CustomerProgramMembership & {
  businessCustomerMembership: BusinessCustomerMembership & {
    business: {
      id: number;
      name: string;
      branding: BusinessBranding | null;
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
  const theme = resolveCardThemeColors({
    cardTheme: membership.loyaltyProgram.cardTheme,
    branding,
    cardDesign,
  });
  const businessName = membership.businessCustomerMembership.business.name;
  const sections = resolveCardDesign(cardDesign).visibleSections;

  // Honor the card design's section visibility so hidden sections don't reappear on the pass.
  const classTextModules = [
    // The class is shared by every customer on the program, so it can only
    // describe the card itself - the per-customer "next reward" lives on the
    // object below.
    ...(sections.rewardBox ? [{ id: "reward", header: "Reward", body: rewardBoxBody(membership) }] : []),
    ...(sections.businessName ? [{ id: "business", header: "Business", body: businessName }] : []),
  ];

  return compactObject({
    id: classId,
    issuerName: businessName,
    programName: membership.loyaltyProgram.name,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: resolveHexBackgroundColor(theme.cardBackground, branding),
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
  const sections = resolveCardDesign(membership.loyaltyProgram.cardDesign as CardDesignInput).visibleSections;

  // Honor the card design's section visibility so hidden sections don't reappear on the pass.
  const objectTextModules = [
    ...(sections.customerName ? [{ id: "customer", header: "Customer", body: customerName }] : []),
    ...(sections.programName ? [{ id: "program", header: "Program", body: membership.loyaltyProgram.name }] : []),
    ...(sections.rewardBox
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
    ...(sections.tierBadge ? [{ id: "tier", header: "Tier", body: customer.currentTier }] : []),
  ];

  // The stamp picture belongs on the object rather than the class. A class is
  // shared by every customer on the program, so a hero image set there would
  // show the same progress to all of them.
  const stampImage = imageModule(
    `${await getBaseUrl()}${stampImagePath(
      membership.loyaltyProgram.uuid,
      Math.min(progress, required),
      required,
      membership.loyaltyProgram.stampEmoji,
    )}`,
    `${Math.min(progress, required)} of ${required} stamps collected`,
  );

  return compactObject({
    id: objectId,
    classId,
    heroImage: stampImage,
    state: membership.scanStatus === "ACTIVE" && membership.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    accountId,
    accountName: customerName,
    loyaltyPoints: {
      label: "Visits",
      balance: {
        string: `${Math.min(progress, required)} / ${required}`,
      },
    },
    secondaryLoyaltyPoints: {
      label: "Remaining",
      balance: {
        string: rewardReady ? "Reward ready" : nextReward ? `${remaining} visit${remaining === 1 ? "" : "s"}` : "Complete",
      },
    },
    barcode: {
      type: "QR_CODE",
      value: scanUrl,
      alternateText: "Scan at checkout",
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

function firstHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/#[0-9a-f]{6}/i);
  return match ? match[0] : null;
}

// Google Wallet only accepts a single solid `hexBackgroundColor`. Card themes often express
// the card background as a CSS gradient string, so pull the first real hex out of it (the
// card's dominant colour) and then fall back through the brand colours. The previous
// implementation rejected any non-hex string and fell back to a generic orange (#F97316),
// which made most passes orange regardless of the business's brand.
function resolveHexBackgroundColor(
  cardBackground: string | null | undefined,
  branding: { primaryColor: string; backgroundColor: string },
): string {
  return (
    firstHexColor(cardBackground) ??
    firstHexColor(branding.primaryColor) ??
    firstHexColor(branding.backgroundColor) ??
    "#1F2937"
  );
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
function rewardBoxBody(membership: GoogleWalletProgramMembership) {
  const rewards = cardRewardsFor(membership.loyaltyProgram);
  if (rewards.length <= 1) return membership.loyaltyProgram.rewardName;
  return rewards.map((reward) => `Visit ${reward.atStamp}: ${reward.rewardName}`).join(" · ");
}
