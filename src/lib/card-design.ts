export type CardDesignVersion = "v1";
export type CardDesignLayoutStyle = "wallet";
export type CardDesignCardStyle = "business-default" | "modern-clean" | "premium-dark" | "minimal-light" | "image-background";
export type CardDesignStampJourneyStyle = "progress-first";
export type CardDesignStampIcon = "default";
export type CardDesignProgressStyle = "linear";
export type CardDesignTypographyPreset = "system";
export type CardDesignBackgroundStyle = "theme";
export type CardDesignDecorationStyle = "none";
export type CardDesignRewardStyle = "panel";
export type CardDesignFooterStyle = "scan-cta";
export type CardDesignAnimationStyle = "subtle";

export type CardDesign = {
  version: CardDesignVersion;
  layoutStyle: CardDesignLayoutStyle;
  cardStyle: CardDesignCardStyle;
  stampJourneyStyle: CardDesignStampJourneyStyle;
  stampIcon: CardDesignStampIcon;
  progressStyle: CardDesignProgressStyle;
  typographyPreset: CardDesignTypographyPreset;
  backgroundStyle: CardDesignBackgroundStyle;
  decorationStyle: CardDesignDecorationStyle;
  rewardStyle: CardDesignRewardStyle;
  footerStyle: CardDesignFooterStyle;
  animationStyle: CardDesignAnimationStyle;
  templateId: string | null;
};

export const defaultCardDesign: CardDesign = {
  version: "v1",
  layoutStyle: "wallet",
  cardStyle: "business-default",
  stampJourneyStyle: "progress-first",
  stampIcon: "default",
  progressStyle: "linear",
  typographyPreset: "system",
  backgroundStyle: "theme",
  decorationStyle: "none",
  rewardStyle: "panel",
  footerStyle: "scan-cta",
  animationStyle: "subtle",
  templateId: null,
};

export type CardDesignInput = Partial<CardDesign> | null | undefined;

const cardDesignValues = {
  version: ["v1"],
  layoutStyle: ["wallet"],
  cardStyle: ["business-default", "modern-clean", "premium-dark", "minimal-light", "image-background"],
  stampJourneyStyle: ["progress-first"],
  stampIcon: ["default"],
  progressStyle: ["linear"],
  typographyPreset: ["system"],
  backgroundStyle: ["theme"],
  decorationStyle: ["none"],
  rewardStyle: ["panel"],
  footerStyle: ["scan-cta"],
  animationStyle: ["subtle"],
} as const;

function resolveValue<T extends keyof typeof cardDesignValues>(
  key: T,
  value: CardDesignInput extends infer _ ? unknown : never,
): CardDesign[T] {
  const allowed = cardDesignValues[key] as readonly string[];
  return (typeof value === "string" && allowed.includes(value) ? value : defaultCardDesign[key]) as CardDesign[T];
}

export function resolveCardDesign(input?: CardDesignInput): CardDesign {
  return {
    version: resolveValue("version", input?.version),
    layoutStyle: resolveValue("layoutStyle", input?.layoutStyle),
    cardStyle: resolveValue("cardStyle", input?.cardStyle),
    stampJourneyStyle: resolveValue("stampJourneyStyle", input?.stampJourneyStyle),
    stampIcon: resolveValue("stampIcon", input?.stampIcon),
    progressStyle: resolveValue("progressStyle", input?.progressStyle),
    typographyPreset: resolveValue("typographyPreset", input?.typographyPreset),
    backgroundStyle: resolveValue("backgroundStyle", input?.backgroundStyle),
    decorationStyle: resolveValue("decorationStyle", input?.decorationStyle),
    rewardStyle: resolveValue("rewardStyle", input?.rewardStyle),
    footerStyle: resolveValue("footerStyle", input?.footerStyle),
    animationStyle: resolveValue("animationStyle", input?.animationStyle),
    templateId: typeof input?.templateId === "string" && input.templateId.trim() ? input.templateId.trim() : null,
  };
}
