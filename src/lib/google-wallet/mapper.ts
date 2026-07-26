import "server-only";

import type { BusinessBranding, BusinessCustomerMembership, CustomerProgramMembership, LoyaltyProgram } from "@prisma/client";
import { resolveCardThemeColors } from "@/lib/card-themes";
import type { CardDesignInput } from "@/lib/card-design";
import { getCardUrl, resolveBranding } from "@/lib/customer-cards";
import { progressValue } from "@/lib/programs";
import { getScanUrl } from "@/lib/scan";

export type GoogleWalletProgramMembership = CustomerProgramMembership & {
  businessCustomerMembership: BusinessCustomerMembership & {
    business: {
      id: number;
      name: string;
      branding: BusinessBranding | null;
    };
  };
  loyaltyProgram: LoyaltyProgram;
};

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

  return compactObject({
    id: classId,
    issuerName: businessName,
    programName: membership.loyaltyProgram.name,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: resolveHexBackgroundColor(theme.cardBackground, branding),
    programLogo: imageModule(absoluteUrl(branding.logoUrl, appUrl) ?? `${appUrl}/logo.png`, `${businessName} logo`),
    // heroImage is intentionally omitted. Google Wallet's hero is a wide banner and the
    // business has no dedicated banner asset; the previous code used the platform's
    // logo.png here, which made every pass show the generic Loyalty Card UAE image. A
    // rendered card image can be set here later for full visual fidelity.
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
    textModulesData: [
      {
        id: "reward",
        header: "Reward",
        body: membership.loyaltyProgram.rewardName,
      },
      {
        id: "business",
        header: "Business",
        body: businessName,
      },
    ],
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
  const remaining = Math.max(0, required - progress);
  const rewardReady = progress >= required;
  const cardUrl = await getCardUrl(customer.cardToken);
  const scanUrl = await getScanUrl(membership.scanToken);

  return compactObject({
    id: objectId,
    classId,
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
        string: rewardReady ? "Reward ready" : `${remaining} visit${remaining === 1 ? "" : "s"}`,
      },
    },
    barcode: {
      type: "QR_CODE",
      value: scanUrl,
      alternateText: "Scan at checkout",
    },
    textModulesData: [
      {
        id: "customer",
        header: "Customer",
        body: customerName,
      },
      {
        id: "program",
        header: "Program",
        body: membership.loyaltyProgram.name,
      },
      {
        id: "reward",
        header: rewardReady ? "Reward ready" : "Next reward",
        body: rewardReady ? `${membership.loyaltyProgram.rewardName} is ready to redeem.` : `${remaining} visit${remaining === 1 ? "" : "s"} until ${membership.loyaltyProgram.rewardName}.`,
      },
      {
        id: "tier",
        header: "Tier",
        body: customer.currentTier,
      },
    ],
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
