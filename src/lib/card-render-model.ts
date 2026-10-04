import type { CardTheme } from "@prisma/client";
import type { CardDesign, CardDesignInput, CardSectionVisibility } from "@/lib/card-design";
import { resolveCardDesign } from "@/lib/card-design";
import { resolveCardThemeColors } from "@/lib/card-themes";

export type CardRenderBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  logoUrl: string | null;
};

export type CardRenderModelInput = {
  branding: CardRenderBranding;
  cardDesign?: CardDesignInput;
  cardTheme?: CardTheme | null;
  business: {
    name: string;
    cardUrl?: string | null;
  };
  customer: {
    name: string;
    memberSince: string;
    tierLabel: string;
    tierIcon: string;
    phone?: string | null;
  };
  program?: {
    name: string | null;
    rewardName: string | null;
    progress: number;
    required: number;
    remaining: number;
    completion: number;
    rewardReady: boolean;
  } | null;
  qr: {
    code: string | null;
    helperText?: string | null;
  };
  /**
   * Businesses that sell memberships hide visit tiers everywhere, including on
   * the card, regardless of the saved card design. Forces the tier badge off.
   */
  tiersHidden?: boolean;
  /**
   * A prepaid membership card counts DOWN: it is issued full and each visit uses
   * one session. When set, the card shows sessionsRemaining filled slots out of
   * totalSessions, with no reward.
   */
  membership?: { sessionsRemaining: number; totalSessions: number } | null;
};

export type CardRenderModel = {
  design: CardDesign;
  layoutStyle: CardDesign["layoutStyle"];
  cardStyle: CardDesign["cardStyle"];
  stampJourneyStyle: CardDesign["stampJourneyStyle"];
  stampIcon: CardDesign["stampIcon"];
  progressStyle: CardDesign["progressStyle"];
  typographyPreset: CardDesign["typographyPreset"];
  backgroundStyle: CardDesign["backgroundStyle"];
  backgroundPattern: CardDesign["backgroundPattern"];
  decorationStyle: CardDesign["decorationStyle"];
  rewardStyle: CardDesign["rewardStyle"];
  footerStyle: CardDesign["footerStyle"];
  animationStyle: CardDesign["animationStyle"];
  templateId: CardDesign["templateId"];
  sectionVisibility: CardSectionVisibility;
  visibleSections: CardSectionVisibility;
  resolvedColors: ReturnType<typeof resolveCardThemeColors>;
  typography: {
    preset: CardDesign["typographyPreset"];
    headingStyle: string;
    bodyStyle: string;
    captionStyle: string;
    emphasisStyle: string;
  };
  background: {
    style: CardDesign["backgroundStyle"];
    pattern: CardDesign["backgroundPattern"];
    cardBackground: string;
    pageBackground: string;
  };
  progress: {
    current: number;
    required: number;
    remaining: number;
    completion: number;
    rewardReady: boolean;
    statusText: string;
    hasProgram: boolean;
  };
  business: {
    name: string;
    logoUrl: string | null;
    cardUrl: string | null;
  };
  customer: {
    name: string;
    memberSince: string;
    tierLabel: string;
    tierIcon: string;
    phone: string | null;
  };
  reward: {
    programName: string | null;
    rewardName: string | null;
    displayProgram: string;
    displayReward: string;
  };
  qr: {
    code: string | null;
    helperText: string;
    cardUrl: string | null;
  };
};

export function buildCardRenderModel(input: CardRenderModelInput): CardRenderModel {
  const design = resolveCardDesign(input.cardDesign);
  const resolvedColors = resolveCardThemeColors({
    cardTheme: input.cardTheme,
    branding: input.branding,
    cardDesign: design,
  });
  const hasProgram = Boolean(input.program && input.program.required > 0);
  const isMembership = Boolean(input.membership);
  const membershipTotal = Math.max(input.membership?.totalSessions ?? 0, 1);
  const membershipRemaining = Math.min(Math.max(input.membership?.sessionsRemaining ?? 0, 0), membershipTotal);
  // A membership card is issued full and depletes: the filled slots represent
  // the sessions the customer has LEFT, not the ones they have used.
  const current = isMembership ? membershipRemaining : (hasProgram ? Math.max(input.program?.progress ?? 0, 0) : 0);
  const required = isMembership ? membershipTotal : (hasProgram ? Math.max(input.program?.required ?? 1, 1) : 1);
  const remaining = isMembership ? membershipRemaining : (hasProgram ? Math.max(input.program?.remaining ?? required - current, 0) : 0);
  const completion = isMembership
    ? Math.round((membershipRemaining / membershipTotal) * 100)
    : (hasProgram ? Math.min(Math.max(input.program?.completion ?? Math.round((current / required) * 100), 0), 100) : 0);
  const rewardReady = isMembership ? false : (hasProgram ? Boolean(input.program?.rewardReady) : false);
  const remainingText = remaining === 1 ? "1 visit remaining" : `${remaining} visits remaining`;
  const statusText = isMembership
    ? (membershipRemaining > 0 ? `${membershipRemaining} of ${membershipTotal} session${membershipTotal === 1 ? "" : "s"} left` : "Membership complete")
    : (hasProgram ? (rewardReady ? "Reward Ready" : remainingText) : "No active program yet");
  const displayProgram = input.program?.name || "Loyalty Card";
  const displayReward = input.program?.rewardName || "Loyalty reward";
  const cardUrl = input.business.cardUrl ?? null;

  // The hero wallet card consumes `design` directly and re-reads its
  // visibleSections, so any section the model suppresses must be turned off on
  // the design ITSELF, not only on the model's computed visibleSections below:
  //   - a membership has no reward box, and
  //   - a business that sells memberships hides visit tiers everywhere.
  const needsSuppressedDesign = isMembership || input.tiersHidden;
  const outputDesign = needsSuppressedDesign
    ? {
        ...design,
        visibleSections: {
          ...design.visibleSections,
          rewardBox: isMembership ? false : design.visibleSections.rewardBox,
          tierBadge: input.tiersHidden ? false : design.visibleSections.tierBadge,
        },
      }
    : design;
  return {
    design: outputDesign,
    layoutStyle: design.layoutStyle,
    cardStyle: design.cardStyle,
    stampJourneyStyle: design.stampJourneyStyle,
    stampIcon: design.stampIcon,
    progressStyle: design.progressStyle,
    typographyPreset: design.typographyPreset,
    backgroundStyle: design.backgroundStyle,
    backgroundPattern: design.backgroundPattern,
    decorationStyle: design.decorationStyle,
    rewardStyle: design.rewardStyle,
    footerStyle: design.footerStyle,
    animationStyle: design.animationStyle,
    templateId: design.templateId,
    sectionVisibility: design.visibleSections,
    visibleSections: {
      logo: design.visibleSections.logo,
      businessName: design.visibleSections.businessName,
      customerName: design.visibleSections.customerName,
      tierBadge: design.visibleSections.tierBadge && !input.tiersHidden,
      rewardBox: design.visibleSections.rewardBox && hasProgram && !isMembership,
      progress: design.visibleSections.progress,
      qr: design.visibleSections.qr,
      footer: design.visibleSections.footer,
      referral: design.visibleSections.referral,
      visits: design.visibleSections.visits && hasProgram,
      programName: design.visibleSections.programName && hasProgram,
    },
    resolvedColors,
    typography: {
      preset: design.typographyPreset,
      headingStyle: `${design.typographyPreset.toLowerCase()}-heading`,
      bodyStyle: `${design.typographyPreset.toLowerCase()}-body`,
      captionStyle: `${design.typographyPreset.toLowerCase()}-caption`,
      emphasisStyle: `${design.typographyPreset.toLowerCase()}-emphasis`,
    },
    background: {
      style: design.backgroundStyle,
      pattern: design.backgroundPattern,
      cardBackground: resolvedColors.cardBackground,
      pageBackground: resolvedColors.pageBackground,
    },
    progress: {
      current,
      required,
      remaining,
      completion,
      rewardReady,
      statusText,
      hasProgram,
    },
    business: {
      name: input.business.name,
      logoUrl: input.branding.logoUrl,
      cardUrl,
    },
    customer: {
      name: input.customer.name,
      memberSince: input.customer.memberSince,
      tierLabel: input.customer.tierLabel,
      tierIcon: input.customer.tierIcon,
      phone: input.customer.phone ?? null,
    },
    reward: {
      programName: input.program?.name ?? null,
      rewardName: input.program?.rewardName ?? null,
      displayProgram,
      displayReward,
    },
    qr: {
      code: input.qr.code,
      helperText: input.qr.helperText || (hasProgram ? "Scan this card" : "Show this QR code to staff to find your customer card."),
      cardUrl,
    },
  };
}
