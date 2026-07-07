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
    hexBackgroundColor: normalizeHex(theme.cardBackground ?? branding.primaryColor),
    programLogo: imageModule(absoluteUrl(branding.logoUrl, appUrl) ?? `${appUrl}/logo.png`, `${businessName} logo`),
    heroImage: imageModule(`${appUrl}/logo.png`, `${businessName} loyalty card`),
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

function normalizeHex(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#F97316";
}

function safeIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)) as T;
}
