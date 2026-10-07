import "server-only";

import type { GoogleWalletProgramMembership } from "@/lib/google-wallet/mapper";
import type { WalletWalletField, WalletWalletPassBody } from "./client";
import { resolveBranding, getBaseUrl } from "@/lib/customer-cards";
import { getScanUrl } from "@/lib/scan";
import { progressValue } from "@/lib/programs";
import { membershipSessionSummary } from "@/lib/membership-sessions";
import { fromStoredTier } from "@/lib/customer-tiers";

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
export async function buildWalletWalletPassBody(membership: GoogleWalletProgramMembership): Promise<WalletWalletPassBody> {
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

  const cashbackEnabled = Boolean(business.cashbackSettings?.enabled);
  const cashbackCurrency = business.cashbackSettings?.currency ?? "AED";
  const cashbackValue = `${cashbackCurrency} ${Number(customer.cashbackBalance ?? 0).toFixed(2)}`;

  const baseUrl = await getBaseUrl();
  const scanUrl = await getScanUrl(membership.scanToken);
  const logoUrl = absoluteUrl(branding.logoUrl, baseUrl);
  const photoUrl = program.walletHeroStyle === "PHOTO" ? absoluteUrl(program.walletPhotoUrl, baseUrl) : null;
  const color = hexColor(branding.primaryColor) ?? hexColor(branding.buttonColor);

  const headerFields: WalletWalletField[] = isMembership
    ? [{ label: "Membership", value: program.name }]
    : [{ label: "Visits", value: `${Math.min(progress, required)} / ${required}`, changeMessage: "Progress: %@" }];

  // When the hero photo is a top banner (stripURL), Apple renders primary
  // fields ON TOP of the photo, so keep primary empty when a banner is present
  // and put the readable text in the header and secondary fields instead.
  const hasBanner = Boolean(photoUrl);
  const primaryFields: WalletWalletField[] = hasBanner ? [] : [{ value: program.name }];

  const secondaryFields: WalletWalletField[] = [];
  if (isMembership) {
    // Sessions remaining is the membership's key balance; show it below the banner.
    secondaryFields.push({ label: "Sessions left", value: `${sessionsRemaining} of ${sessionsTotal}`, changeMessage: "%@ sessions left" });
  } else if (hasBanner) {
    secondaryFields.push({ label: "Program", value: program.name });
  }
  if (cashbackEnabled) {
    secondaryFields.push({ label: "Cashback", value: cashbackValue, changeMessage: "Cashback: %@" });
  }
  // Show the loyalty tier once the customer has climbed past Bronze, so a
  // tier-running business sees it on the pass; Bronze/none adds no field.
  const tierLabel = fromStoredTier(customer.currentTier);
  if (tierLabel && tierLabel !== "Bronze") {
    secondaryFields.push({ label: "Tier", value: tierLabel });
  }
  // Keep the member name on the pass face only while there is still room for it
  // to read cleanly (at most two columns). It is always on the back regardless.
  if (secondaryFields.length < 2) {
    secondaryFields.push({ label: "Member", value: customerName });
  }

  // backFields[0] is a stable notification anchor for on-demand banners. Its
  // position must never change between create and update (fields are keyed by
  // order), so it stays first.
  const backFields: WalletWalletField[] = [
    { label: "Notifications", value: " ", changeMessage: "%@" },
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
  if (photoUrl) body.stripURL = photoUrl; // Pro - banner behind the primary field (top of pass)
  return body;
}
