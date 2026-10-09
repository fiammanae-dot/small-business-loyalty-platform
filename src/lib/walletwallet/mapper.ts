import "server-only";

import type { GoogleWalletProgramMembership } from "@/lib/google-wallet/mapper";
import type { WalletWalletField, WalletWalletPassBody } from "./client";
import { resolveBranding, getBaseUrl, getCardUrl } from "@/lib/customer-cards";
import { getScanUrl } from "@/lib/scan";
import { progressValue } from "@/lib/programs";
import { membershipSessionSummary } from "@/lib/membership-sessions";
import { stampImagePath } from "@/lib/wallet/stamp-image";
import { fromStoredTier } from "@/lib/customer-tiers";
import { applePrimaryFields, buildCashbackPassView, buildProgramPassView, type WalletPassView } from "@/lib/wallet-pass-view";
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

  // Every visible slot of the pass (colour, banner, header and field rows) comes
  // from the shared pass view - the same one the web card and the Design Studio
  // preview render - so all three always show the same card.
  const view = buildProgramPassView({
    businessName,
    logoUrl,
    branding,
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
    // Tier is a stamp-program feature: it rides on the stamp card (never on a
    // membership card, and not a separate card) when the business runs tiers.
    tierName: !isMembership && business.tierSetting
      ? fromStoredTier(customer.currentTier as Parameters<typeof fromStoredTier>[0]) ?? "Bronze"
      : null,
  });

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
    barcodeAltText: view.barcodeAltText,
    logoText: businessName,
    organizationName: businessName,
    description: `${program.name} - ${businessName}`,
    primaryFields: applePrimaryFields(view) as WalletWalletField[],
    headerFields: [view.header] as WalletWalletField[],
    secondaryFields: view.secondaryFields as WalletWalletField[],
    backFields,
    sharingProhibited: true,
    colorPreset: "dark",
    expirationDays: 365,
  };
  applyPassLook(body, view, baseUrl, program.uuid);
  return body;
}

/**
 * The pass colour, logo and banner, all from the shared view. Stamp banners are
 * served as a PNG by /api/wallet/stamps - drawn from the same SVG the web card
 * draws inline.
 */
function applyPassLook(body: WalletWalletPassBody, view: WalletPassView, baseUrl: string, programUuid?: string) {
  const color = hexColor(view.colors.background);
  if (color) body.color = color; // Pro
  if (view.logoUrl) body.logoURL = view.logoUrl; // Pro
  const banner = view.banner;
  if (banner?.kind === "photo") body.stripURL = banner.url; // Pro - banner at the top of the pass
  if (banner?.kind === "stamps" && programUuid) {
    body.stripURL = `${baseUrl}${stampImagePath(programUuid, banner.filled, banner.total, banner.emoji, banner.customIconUrl)}`; // the live visit grid
  }
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
  // Same shared view as the program card and the cashback preview: the program
  // name is the header, the row under the banner is Member then Balance, and
  // without a banner the balance is the big primary field instead.
  const view = buildCashbackPassView({
    businessName,
    logoUrl: absoluteUrl(branding.logoUrl, baseUrl),
    branding,
    cashback: {
      name: cs?.name,
      cardTheme: cs?.cardTheme,
      cardDesign: cs?.cardDesign,
      photoUrl: absoluteUrl(cs?.walletPhotoUrl, baseUrl),
    },
    customerName,
    balance,
  });

  const body: WalletWalletPassBody = {
    barcodeValue: cardUrl,
    barcodeFormat: "QR",
    barcodeAltText: view.barcodeAltText,
    logoText: businessName,
    organizationName: businessName,
    description: `${cardName} - ${businessName}`,
    headerFields: [view.header] as WalletWalletField[],
    primaryFields: applePrimaryFields(view) as WalletWalletField[],
    secondaryFields: view.secondaryFields as WalletWalletField[],
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
  applyPassLook(body, view, baseUrl);
  return body;
}
