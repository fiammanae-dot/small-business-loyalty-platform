import type { CardTheme } from "@prisma/client";
import type { CardDesign, CardDesignInput } from "@/lib/card-design";
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
  visibleSections: {
    wallet: boolean;
    scan: boolean;
    progress: boolean;
    reward: boolean;
    tier: boolean;
    qr: boolean;
    footer: boolean;
  };
  resolvedColors: ReturnType<typeof resolveCardThemeColors>;
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
  const current = hasProgram ? Math.max(input.program?.progress ?? 0, 0) : 0;
  const required = hasProgram ? Math.max(input.program?.required ?? 1, 1) : 1;
  const remaining = hasProgram ? Math.max(input.program?.remaining ?? required - current, 0) : 0;
  const completion = hasProgram ? Math.min(Math.max(input.program?.completion ?? Math.round((current / required) * 100), 0), 100) : 0;
  const rewardReady = hasProgram ? Boolean(input.program?.rewardReady) : false;
  const remainingText = remaining === 1 ? "1 visit remaining" : `${remaining} visits remaining`;
  const statusText = hasProgram ? (rewardReady ? "Reward Ready" : remainingText) : "No active program yet";
  const displayProgram = input.program?.name || "Loyalty Card";
  const displayReward = input.program?.rewardName || "Loyalty reward";
  const cardUrl = input.business.cardUrl ?? null;

  return {
    design,
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
    visibleSections: {
      wallet: true,
      scan: true,
      progress: true,
      reward: hasProgram,
      tier: true,
      qr: true,
      footer: true,
    },
    resolvedColors,
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
