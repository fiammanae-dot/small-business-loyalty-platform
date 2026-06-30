import type { BusinessType } from "@prisma/client";

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

export type IndustryDesignPackId = "BARBERSHOP" | "BEAUTY_SALON" | "CAR_WASH" | "CAFE" | "RESTAURANT" | "GENERAL";

export type IndustryDesignPack = {
  id: IndustryDesignPackId;
  label: string;
  businessTypes: BusinessType[];
  cardDesign: CardDesign;
};

export const industryDesignPacks: Record<IndustryDesignPackId, IndustryDesignPack> = {
  BARBERSHOP: {
    id: "BARBERSHOP",
    label: "Barbershop",
    businessTypes: ["BARBERSHOP"],
    cardDesign: {
      ...defaultCardDesign,
      cardStyle: "premium-dark",
      templateId: "industry-barbershop-v1",
    },
  },
  BEAUTY_SALON: {
    id: "BEAUTY_SALON",
    label: "Beauty Salon",
    businessTypes: ["BEAUTY_SALON"],
    cardDesign: {
      ...defaultCardDesign,
      cardStyle: "minimal-light",
      templateId: "industry-beauty-salon-v1",
    },
  },
  CAR_WASH: {
    id: "CAR_WASH",
    label: "Car Wash",
    businessTypes: ["CAR_CARE_CENTER"],
    cardDesign: {
      ...defaultCardDesign,
      cardStyle: "image-background",
      templateId: "industry-car-wash-v1",
    },
  },
  CAFE: {
    id: "CAFE",
    label: "Cafe",
    businessTypes: ["COFFEE_SHOP"],
    cardDesign: {
      ...defaultCardDesign,
      cardStyle: "modern-clean",
      templateId: "industry-cafe-v1",
    },
  },
  RESTAURANT: {
    id: "RESTAURANT",
    label: "Restaurant",
    businessTypes: ["RESTAURANT"],
    cardDesign: {
      ...defaultCardDesign,
      cardStyle: "premium-dark",
      templateId: "industry-restaurant-v1",
    },
  },
  GENERAL: {
    id: "GENERAL",
    label: "General",
    businessTypes: ["OTHER"],
    cardDesign: {
      ...defaultCardDesign,
      templateId: "industry-general-v1",
    },
  },
};

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

function resolveValue<T extends keyof typeof cardDesignValues>(key: T, value: unknown): CardDesign[T] {
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

export function getIndustryDesignPackId(businessType?: BusinessType | null): IndustryDesignPackId {
  if (!businessType) {
    return "GENERAL";
  }

  for (const pack of Object.values(industryDesignPacks)) {
    if (pack.businessTypes.includes(businessType)) {
      return pack.id;
    }
  }

  return "GENERAL";
}

export function getIndustryDesignPack(businessType?: BusinessType | null): IndustryDesignPack {
  return industryDesignPacks[getIndustryDesignPackId(businessType)];
}

export function resolveIndustryCardDesign(businessType?: BusinessType | null, overrides?: CardDesignInput): CardDesign {
  const pack = getIndustryDesignPack(businessType);
  return resolveCardDesign({
    ...pack.cardDesign,
    ...overrides,
  });
}
