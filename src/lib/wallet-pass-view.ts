import type { CardTheme } from "@prisma/client";
import { getCardStyleForLayoutStyle, type CardDesignInput, type CardDesignLayoutStyle, type CardDesignStampIcon } from "@/lib/card-design";
import { resolveWalletCardColors } from "@/lib/card-themes";
import { DARK_FOREGROUND } from "@/lib/color-contrast";
import { customStampIconForDesign, stampEmojiForDesign } from "@/lib/stamp-icon-marks";
import { translateFor } from "@/i18n/dictionaries";
import { resolveLocale } from "@/i18n/locales";

/**
 * What a customer's wallet pass shows, decided once.
 *
 * Apple and Google lay a pass out themselves; an issuer only fills fixed slots
 * (a colour, a logo, a banner picture, a few label/value fields and a QR code).
 * This module fills those slots, and EVERY surface reads the result:
 *
 *   - the Apple pass body (walletwallet/mapper.ts),
 *   - the "Open Card" page customers see on the web,
 *   - the Design Studio and create-program previews.
 *
 * So what a business designs is what the web card shows is what the wallet
 * shows. Nothing here may depend on a server-only module: the previews run it
 * in the browser.
 */

export type WalletPassField = { label?: string; value: string; changeMessage?: string };

export type WalletPassBanner =
  | { kind: "photo"; url: string }
  | { kind: "stamps"; filled: number; total: number; emoji: string; customIconUrl: string | null };

export type WalletPassColors = { background: string; foreground: string; muted: string };

export type WalletPassView = {
  kind: "program" | "cashback";
  colors: WalletPassColors;
  businessName: string;
  logoUrl: string | null;
  /** The card's own name (program or cashback program). */
  title: string;
  customerName: string;
  /** "Member", in the customer's language (the web card's Google layout shows it). */
  memberLabel: string;
  /** Apple: the field at the top right of the pass. */
  header: WalletPassField;
  /** Apple: the row under the banner. */
  secondaryFields: WalletPassField[];
  /** Apple strip banner / Google hero image. Null = no picture (cashback without a photo). */
  banner: WalletPassBanner | null;
  /** Google's two point rows on the front of the pass. */
  google: { primary: WalletPassField; secondary: WalletPassField | null };
  barcodeAltText: string;
};

export type WalletPassBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
};

export function walletPassColors(input: { cardTheme?: CardTheme | null; branding: WalletPassBranding; cardDesign?: CardDesignInput }): WalletPassColors {
  const { background, foreground } = resolveWalletCardColors(input);
  return {
    background,
    foreground,
    muted: foreground === DARK_FOREGROUND ? "rgba(17,24,39,0.62)" : "rgba(255,255,255,0.72)",
  };
}

export const WALLET_BARCODE_ALT_TEXT = "Scan at checkout";

export type ProgramPassInput = {
  businessName: string;
  logoUrl: string | null;
  branding: WalletPassBranding;
  program: {
    name: string;
    isMembership: boolean;
    requiredStamps: number;
    cardTheme?: CardTheme | null;
    cardDesign?: unknown;
    /** "PHOTO" shows photoUrl as the banner when there is one; otherwise the stamps. */
    walletHeroStyle?: string | null;
    photoUrl?: string | null;
  };
  customerName: string;
  /** Stamps collected (earned + bonus). Ignored for a membership. */
  progress: number;
  /** A prepaid membership counts down: visits left of the package total. */
  membership?: { remaining: number; total: number } | null;
  /** The customer's tier, only when the business runs tiers. Never on a membership card. */
  tierName?: string | null;
  /** For Google's "Remaining" row on a stamp card. */
  reward?: { ready: boolean; visitsToNext: number | null } | null;
  /** The customer's language ("en" / "ar"): the field labels are written in it. */
  locale?: string | null;
};

export function buildProgramPassView(input: ProgramPassInput): WalletPassView {
  const { program } = input;
  const t = translateFor(resolveLocale(input.locale));
  const isMembership = program.isMembership;
  const required = Math.max(1, program.requiredStamps);
  const collected = Math.min(Math.max(0, input.progress), required);
  const membershipTotal = Math.max(1, input.membership?.total ?? required);
  const membershipRemaining = Math.min(Math.max(0, input.membership?.remaining ?? 0), membershipTotal);

  // The picture: the uploaded photo when the business chose one, otherwise the
  // live stamp grid (memberships count down - filled = visits left).
  const photo = program.walletHeroStyle === "PHOTO" && program.photoUrl ? program.photoUrl : null;
  const banner: WalletPassBanner = photo
    ? { kind: "photo", url: photo }
    : {
        kind: "stamps",
        filled: isMembership ? membershipRemaining : collected,
        total: isMembership ? membershipTotal : required,
        emoji: stampEmojiForDesign(program.cardDesign),
        customIconUrl: customStampIconForDesign(program.cardDesign),
      };

  const header: WalletPassField = isMembership
    ? { label: t("pass.membership"), value: program.name }
    : { label: t("pass.visits"), value: `${collected} / ${required}`, changeMessage: t("pass.progress") };

  // The program card is single-purpose: its own data plus the holder's name.
  // Cashback is its own card; tier rides on a stamp card when the business runs tiers.
  const secondaryFields: WalletPassField[] = [];
  if (isMembership) {
    secondaryFields.push({ label: t("pass.visitsLeft"), value: t("pass.ofTotal", { remaining: membershipRemaining, total: membershipTotal }), changeMessage: t("pass.visitsLeftChange") });
  } else {
    secondaryFields.push({ label: t("pass.program"), value: program.name });
    if (input.tierName) secondaryFields.push({ label: t("pass.tier"), value: t(`tier.${input.tierName}`), changeMessage: t("pass.tierChange") });
  }
  secondaryFields.push({ label: t("pass.member"), value: input.customerName });

  const visitsToNext = input.reward?.visitsToNext ?? null;
  const google = isMembership
    ? {
        primary: { label: t("pass.visitsLeft"), value: t("pass.ofTotal", { remaining: membershipRemaining, total: membershipTotal }) },
        secondary: { label: t("pass.status"), value: membershipRemaining > 0 ? t("pass.active") : t("pass.usedUp") },
      }
    : {
        primary: { label: t("pass.visits"), value: `${collected} / ${required}` },
        secondary: {
          label: t("pass.remaining"),
          value: input.reward?.ready
            ? t("pass.rewardReady")
            : visitsToNext !== null
              ? t.plural("pass.visitCount", visitsToNext)
              : t("pass.complete"),
        },
      };

  return {
    kind: "program",
    colors: walletPassColors({ cardTheme: program.cardTheme, branding: input.branding, cardDesign: program.cardDesign as CardDesignInput }),
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    title: program.name,
    customerName: input.customerName,
    memberLabel: t("pass.member"),
    header,
    secondaryFields,
    banner,
    google,
    barcodeAltText: t("pass.scanAtCheckout"),
  };
}

export type CashbackPassInput = {
  businessName: string;
  logoUrl: string | null;
  branding: WalletPassBranding;
  cashback: { name?: string | null; cardTheme?: CardTheme | null; cardDesign?: unknown; photoUrl?: string | null };
  customerName: string;
  /** Already formatted, e.g. "AED 25.00". */
  balance: string;
  /** The customer's language ("en" / "ar"): the field labels are written in it. */
  locale?: string | null;
};

export function buildCashbackPassView(input: CashbackPassInput): WalletPassView {
  const t = translateFor(resolveLocale(input.locale));
  const title = input.cashback.name?.trim() || t("pass.cashback");
  const photo = input.cashback.photoUrl || null;
  const balanceField: WalletPassField = { label: t("pass.balance"), value: input.balance, changeMessage: t("pass.balanceChange") };
  // Apple draws primary fields ON TOP of a banner, so with a photo the balance
  // moves into the row under it (Member left, Balance right).
  const secondaryFields: WalletPassField[] = [{ label: t("pass.member"), value: input.customerName }];
  if (photo) secondaryFields.push(balanceField);

  return {
    kind: "cashback",
    colors: walletPassColors({
      cardTheme: input.cashback.cardTheme ?? "BUSINESS_DEFAULT",
      branding: input.branding,
      cardDesign: (input.cashback.cardDesign ?? undefined) as CardDesignInput,
    }),
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    title,
    customerName: input.customerName,
    memberLabel: t("pass.member"),
    header: { label: t("pass.program"), value: title },
    secondaryFields,
    banner: photo ? { kind: "photo", url: photo } : null,
    google: { primary: balanceField, secondary: null },
    // The cashback barcode opens the customer's card for staff, not a stamp scan.
    barcodeAltText: t("pass.showAtCheckout"),
  };
}

/** Apple's big primary field: only when there is no banner to cover it. */
export function applePrimaryFields(view: WalletPassView): WalletPassField[] {
  if (view.banner) return [];
  return view.kind === "cashback" ? [view.google.primary] : [{ value: view.title }];
}

/**
 * The card colours a business can pick. Wallets take one solid colour, so this
 * is the whole choice: the brand colour, or one of three fixed colourways.
 * `layoutStyle` is what a program's card design stores; `cardTheme` is what the
 * cashback card stores. Both resolve to the same swatch.
 */
export const walletColourChoices: Array<{ layoutStyle: CardDesignLayoutStyle; cardTheme: CardTheme; label: string; description: string }> = [
  { layoutStyle: "CLASSIC", cardTheme: "BUSINESS_DEFAULT", label: "Brand colour", description: "Your brand colour from Business Branding." },
  { layoutStyle: "MODERN", cardTheme: "COFFEE_CAFE", label: "Deep teal", description: "A calm dark teal." },
  { layoutStyle: "PREMIUM", cardTheme: "RESTAURANT", label: "Charcoal", description: "A near-black premium look." },
  { layoutStyle: "LUXURY", cardTheme: "BEAUTY_SALON", label: "White", description: "A clean white card." },
];

/** MINIMAL is a legacy layout that renders exactly like CLASSIC. */
export function walletColourLayoutStyle(layoutStyle: CardDesignLayoutStyle): CardDesignLayoutStyle {
  return walletColourChoices.some((choice) => choice.layoutStyle === layoutStyle) ? layoutStyle : "CLASSIC";
}

/**
 * A card design as the previews hold it (colour + icon), completed the way a
 * save completes it. The colour is decided by cardStyle, which a save derives
 * from layoutStyle - a preview must do the same or it would show the wrong
 * colour.
 */
export function walletPreviewDesign(
  layoutStyle: CardDesignLayoutStyle,
  stampIcon: CardDesignStampIcon,
  customStampIconUrl: string | null = null,
): CardDesignInput {
  return { layoutStyle, cardStyle: getCardStyleForLayoutStyle(layoutStyle), stampIcon, customStampIconUrl };
}
