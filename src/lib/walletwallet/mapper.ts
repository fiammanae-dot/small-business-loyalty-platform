import "server-only";

import type { GoogleWalletProgramMembership } from "@/lib/google-wallet/mapper";
import type { WalletWalletField, WalletWalletPassBody } from "./client";
import { resolveBranding, getBaseUrl, getCardUrl } from "@/lib/customer-cards";
import { getScanUrl } from "@/lib/scan";
import { progressValue } from "@/lib/programs";
import { membershipSessionSummary } from "@/lib/membership-sessions";
import { stampImagePath } from "@/lib/wallet/stamp-image";
import { stampEmojiForDesign } from "@/lib/stamp-icon-marks";
import { fromStoredTier } from "@/lib/customer-tiers";
import { resolveWalletCardColors } from "@/lib/card-themes";
import type { CardDesignInput } from "@/lib/card-design";
import type { CardTheme, Prisma, WalletHeroStyle } from "@prisma/client";

function absoluteUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || /^data:/i.test(url)) return url;
  return `${base.replace(/\/+$/, "")}/${String(url).replace(/^\/+/, "")}`;
}

function hexColor(value: string | null | undefined): string | undefined {
  const v = value?.trim();
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined;
}

/**
 * Build the WalletWallet pass body for a membership/loyalty card. Mirrors the
 * data the Google Wallet pass uses so Apple and Google stay in step: the scan
 * URL is the barcode, sessions/cashback are the live fields, the brand color
 * and logo brand the card, and the uploaded hero photo becomes the top banner
 * (stripURL) - the banner-at-top look the client's mockup wanted.
 */
export async function buildWalletWalletPassBody(membership: GoogleWalletProgramMembership, options?: { notification?: string }): Promise<WalletWalletPassBody> {
  const customer = membership.businessCustomerMembership;
  const business = customer.business;
  const program = membership.loyaltyProgram;
  const branding = resolveBranding(business.branding);
  const businessName = business.name;
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const isMembership = program.isMembership;
  const required = Math.max(1, program.requiredStamps);
  const progress = progressValue(membership.earnedStamps, membership.bonusStamps);

  const summary = isMembership
    ? membershipSessionSummary({
        requiredStamps: program.requiredStamps,
        earnedStamps: membership.earnedStamps,
        bonusStamps: membership.bonusStamps,
        sessionsForfeited: membership.sessionsForfeited,
      })
    : null;
  const sessionsRemaining = summary?.remaining ?? 0;
  const sessionsTotal = summary?.total ?? required;

  const baseUrl = await getBaseUrl();
  const scanUrl = await getScanUrl(membership.scanToken);
  const logoUrl = absoluteUrl(branding.logoUrl, baseUrl);
  const photoUrl = program.walletHeroStyle === "PHOTO" ? absoluteUrl(program.walletPhotoUrl, baseUrl) : null;
  // The same solid colour the Google pass and the web card use, from the
  // program's own theme and design (not the raw brand primary colour).
  const color = hexColor(
    resolveWalletCardColors({ cardTheme: program.cardTheme, branding, cardDesign: program.cardDesign as CardDesignInput }).background,
  );

  // The visit/stamp grid drawn as a picture, the same image the Google card uses.
  // Memberships count down (filled = visits left); stamp cards count up.
  const gridFilled = isMembership ? sessionsRemaining : Math.min(progress, required);
  const gridTotal = isMembership ? Math.max(1, sessionsTotal) : required;
  const gridUrl = `${baseUrl}${stampImagePath(program.uuid, gridFilled, gridTotal, stampEmojiForDesign(program.cardDesign))}`;
  // A top banner is always present now: the uploaded hero photo if the business
  // set one, otherwise the live visit grid.
  const bannerUrl = photoUrl ?? gridUrl;

  const headerFields: WalletWalletField[] = isMembership
    ? [{ label: "Membership", value: program.name }]
    : [{ label: "Visits", value: `${Math.min(progress, required)} / ${required}`, changeMessage: "Progress: %@" }];

  // When the hero photo is a top banner (stripURL), Apple renders primary
  // fields ON TOP of the photo, so keep primary empty when a banner is present
  // and put the readable text in the header and secondary fields instead.
  const hasBanner = Boolean(bannerUrl);
  const primaryFields: WalletWalletField[] = hasBanner ? [] : [{ value: program.name }];

  // The program card is single-purpose: its own data plus the holder's name.
  // Cashback and tier are their own separate wallet cards, not fields here.
  const secondaryFields: WalletWalletField[] = [];
  if (isMembership) {
    secondaryFields.push({ label: "Visits left", value: `${sessionsRemaining} of ${sessionsTotal}`, changeMessage: "%@ visits left" });
  } else if (hasBanner) {
    secondaryFields.push({ label: "Program", value: program.name });
  }
  // Tier is a stamp-program feature, so it rides on the stamp card (never on a
  // membership card, and not a separate card) when the business runs tiers.
  if (!isMembership && business.tierSetting) {
    const tierName = fromStoredTier(customer.currentTier as Parameters<typeof fromStoredTier>[0]) ?? "Bronze";
    secondaryFields.push({ label: "Tier", value: tierName, changeMessage: "Tier: %@" });
  }
  secondaryFields.push({ label: "Member", value: customerName });

  // backFields[0] is a stable notification anchor for on-demand banners. Its
  // position must never change between create and update (fields are keyed by
  // order), so it stays first.
  const backFields: WalletWalletField[] = [
    { label: "Notifications", value: options?.notification?.trim() || " ", changeMessage: "%@" },
    { label: "Program", value: program.name },
    { label: "Business", value: businessName },
    { label: "Member", value: customerName },
  ];

  const body: WalletWalletPassBody = {
    barcodeValue: scanUrl,
    barcodeFormat: "QR",
    barcodeAltText: "Scan at checkout",
    logoText: businessName,
    organizationName: businessName,
    description: `${program.name} - ${businessName}`,
    primaryFields,
    headerFields,
    secondaryFields,
    backFields,
    sharingProhibited: true,
    colorPreset: "dark",
    expirationDays: 365,
  };
  if (color) body.color = color; // Pro
  if (logoUrl) body.logoURL = logoUrl; // Pro
  if (bannerUrl) body.stripURL = bannerUrl; // Pro - banner at the top of the pass (photo, or the live visit grid)
  return body;
}


/** A customer plus the business fields a per-customer feature pass needs. */
export type FeaturePassCustomer = {
  firstName: string;
  lastName: string | null;
  cardToken: string;
  cashbackBalance: unknown;
  currentTier: string | null;
  business: {
    name: string;
    branding: Parameters<typeof resolveBranding>[0];
    cashbackSettings?: {
      enabled: boolean;
      currency: string;
      name?: string | null;
      cardTheme?: CardTheme | null;
      cardDesign?: Prisma.JsonValue | null;
      walletHeroStyle?: WalletHeroStyle | null;
      walletPhotoUrl?: string | null;
    } | null;
  };
};

/**
 * Build the WalletWallet pass body for the CASHBACK card - a per-customer card
 * that shows the holder's name and their cashback balance only. The barcode is
 * the customer's card URL so staff can pull them up to add or spend cashback.
 */
export async function buildCashbackPassBody(customer: FeaturePassCustomer, options?: { notification?: string }): Promise<WalletWalletPassBody> {
  const branding = resolveBranding(customer.business.branding);
  const businessName = customer.business.name;
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const cs = customer.business.cashbackSettings;
  // The cashback program's own identity (phase 2): its name, card theme and
  // card picture, so the card is branded like a real program rather than the
  // generic business default.
  const cardName = cs?.name?.trim() || "Cashback";
  const currency = cs?.currency ?? "AED";
  const balance = `${currency} ${Number(customer.cashbackBalance ?? 0).toFixed(2)}`;

  const baseUrl = await getBaseUrl();
  const cardUrl = await getCardUrl(customer.cardToken);
  const logoUrl = absoluteUrl(branding.logoUrl, baseUrl);
  const photoUrl = absoluteUrl(cs?.walletPhotoUrl, baseUrl);
  const hasBanner = Boolean(photoUrl);
  // Same resolver as every other card, fed the cashback program's own theme and design.
  const color = hexColor(
    resolveWalletCardColors({
      cardTheme: cs?.cardTheme ?? "BUSINESS_DEFAULT",
      branding,
      cardDesign: (cs?.cardDesign ?? undefined) as CardDesignInput,
    }).background,
  );

  // The program name is the top header. The middle row reads Member (left) then
  // Balance (right); with a banner the balance sits here, and without one it is
  // the big primary field instead (Apple draws primary fields over a banner).
  const secondaryFields: WalletWalletField[] = [];
  secondaryFields.push({ label: "Member", value: customerName });
  if (hasBanner) secondaryFields.push({ label: "Balance", value: balance, changeMessage: "Balance: %@" });

  const body: WalletWalletPassBody = {
    barcodeValue: cardUrl,
    barcodeFormat: "QR",
    barcodeAltText: "Show at checkout",
    logoText: businessName,
    organizationName: businessName,
    description: `${cardName} - ${businessName}`,
    headerFields: [{ label: "Program", value: cardName }] as WalletWalletField[],
    primaryFields: (hasBanner ? [] : [{ label: "Balance", value: balance, changeMessage: "Balance: %@" }]) as WalletWalletField[],
    secondaryFields: secondaryFields,
    backFields: [
      { label: "Notifications", value: options?.notification?.trim() || " ", changeMessage: "%@" },
      { label: "Program", value: cardName },
      { label: "Business", value: businessName },
      { label: "Member", value: customerName },
    ] as WalletWalletField[],
    sharingProhibited: true,
    colorPreset: "dark",
    expirationDays: 365,
  };
  if (color) body.color = color; // Pro
  if (logoUrl) body.logoURL = logoUrl; // Pro
  if (photoUrl) body.stripURL = photoUrl; // Pro - banner at the top of the pass
  return body;
}
