import type { BusinessType, CardTheme } from "@prisma/client";

export type CardDesignVersion = "v1";
export const cardLayoutStyles = ["CLASSIC", "MODERN", "PREMIUM", "MINIMAL", "LUXURY"] as const;
export type CardDesignLayoutStyle = (typeof cardLayoutStyles)[number];
export type CardDesignCardStyle = "business-default" | "modern-clean" | "premium-dark" | "minimal-light" | "image-background";
export const stampJourneyStyles = ["CIRCLES", "CONNECTED_DOTS", "PROGRESS_BAR", "ICON_GRID", "ROADMAP", "TICKET_PUNCH"] as const;
export type CardDesignStampJourneyStyle = (typeof stampJourneyStyles)[number];
export const generalStampIcons = ["STAR", "HEART", "CHECK", "CIRCLE", "DIAMOND", "GIFT"] as const;
export const barbershopStampIcons = ["SCISSORS", "RAZOR", "COMB", "BARBER_POLE"] as const;
export const cafeStampIcons = ["COFFEE_CUP", "COFFEE_BEAN", "ESPRESSO"] as const;
export const restaurantStampIcons = ["PLATE", "BURGER", "PIZZA", "CHEF_HAT"] as const;
export const carWashStampIcons = ["CAR", "WATER_DROP", "BUBBLES", "WHEEL"] as const;
export const beautySalonStampIcons = ["LIPSTICK", "MIRROR", "MAKEUP_BRUSH", "NAIL_POLISH"] as const;
export const stampIcons = [
  ...generalStampIcons,
  ...barbershopStampIcons,
  ...cafeStampIcons,
  ...restaurantStampIcons,
  ...carWashStampIcons,
  ...beautySalonStampIcons,
] as const;
export type CardDesignStampIcon = (typeof stampIcons)[number];
export type CardDesignProgressStyle = "linear";
export const typographyPresets = ["CLASSIC", "MODERN", "PREMIUM", "LUXURY", "PLAYFUL", "MINIMAL"] as const;
export type CardDesignTypographyPreset = (typeof typographyPresets)[number];
export const cardBackgroundStyles = ["SOLID", "GRADIENT", "PATTERN", "TEXTURE", "IMAGE", "INDUSTRY_PATTERN"] as const;
export type CardDesignBackgroundStyle = (typeof cardBackgroundStyles)[number];
export const backgroundPatternPresets = [
  "NONE",
  "SUBTLE_DOTS",
  "DIAGONAL_LINES",
  "WAVES",
  "COFFEE_BEANS",
  "SCISSORS",
  "WATER_BUBBLES",
  "FOOD_PATTERN",
  "BEAUTY_PATTERN",
] as const;
export type CardDesignBackgroundPattern = (typeof backgroundPatternPresets)[number];
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
  backgroundPattern: CardDesignBackgroundPattern;
  decorationStyle: CardDesignDecorationStyle;
  rewardStyle: CardDesignRewardStyle;
  footerStyle: CardDesignFooterStyle;
  animationStyle: CardDesignAnimationStyle;
  templateId: string | null;
};

export const defaultCardDesign: CardDesign = {
  version: "v1",
  layoutStyle: "CLASSIC",
  cardStyle: "business-default",
  stampJourneyStyle: "CIRCLES",
  stampIcon: "STAR",
  progressStyle: "linear",
  typographyPreset: "MODERN",
  backgroundStyle: "SOLID",
  backgroundPattern: "NONE",
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
      stampIcon: "SCISSORS",
      typographyPreset: "PREMIUM",
      backgroundStyle: "INDUSTRY_PATTERN",
      backgroundPattern: "SCISSORS",
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
      stampIcon: "LIPSTICK",
      typographyPreset: "LUXURY",
      backgroundStyle: "INDUSTRY_PATTERN",
      backgroundPattern: "BEAUTY_PATTERN",
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
      stampIcon: "WATER_DROP",
      typographyPreset: "MODERN",
      backgroundStyle: "INDUSTRY_PATTERN",
      backgroundPattern: "WATER_BUBBLES",
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
      stampIcon: "COFFEE_CUP",
      typographyPreset: "CLASSIC",
      backgroundStyle: "INDUSTRY_PATTERN",
      backgroundPattern: "COFFEE_BEANS",
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
      stampIcon: "PLATE",
      typographyPreset: "PREMIUM",
      backgroundStyle: "INDUSTRY_PATTERN",
      backgroundPattern: "FOOD_PATTERN",
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
  layoutStyle: cardLayoutStyles,
  cardStyle: ["business-default", "modern-clean", "premium-dark", "minimal-light", "image-background"],
  stampJourneyStyle: stampJourneyStyles,
  stampIcon: stampIcons,
  progressStyle: ["linear"],
  typographyPreset: typographyPresets,
  backgroundStyle: cardBackgroundStyles,
  backgroundPattern: backgroundPatternPresets,
  decorationStyle: ["none"],
  rewardStyle: ["panel"],
  footerStyle: ["scan-cta"],
  animationStyle: ["subtle"],
} as const;

function resolveValue<T extends keyof typeof cardDesignValues>(key: T, value: unknown): CardDesign[T] {
  const allowed = cardDesignValues[key] as readonly string[];
  return (typeof value === "string" && allowed.includes(value) ? value : defaultCardDesign[key]) as CardDesign[T];
}

export function resolveStampJourneyStyle(value: unknown): CardDesignStampJourneyStyle {
  if (value === "progress-first") {
    return "CIRCLES";
  }

  return resolveValue("stampJourneyStyle", value);
}

export function resolveCardLayoutStyle(value: unknown): CardDesignLayoutStyle {
  if (value === "wallet") {
    return "CLASSIC";
  }

  return resolveValue("layoutStyle", value);
}

export function resolveStampIcon(value: unknown): CardDesignStampIcon {
  if (value === "default") {
    return "STAR";
  }

  return resolveValue("stampIcon", value);
}

export function resolveTypographyPreset(value: unknown): CardDesignTypographyPreset {
  if (value === "system") {
    return "MODERN";
  }

  return resolveValue("typographyPreset", value);
}

export function resolveBackgroundStyle(value: unknown): CardDesignBackgroundStyle {
  if (value === "theme") {
    return "SOLID";
  }

  return resolveValue("backgroundStyle", value);
}

export function resolveBackgroundPattern(value: unknown): CardDesignBackgroundPattern {
  return resolveValue("backgroundPattern", value);
}

export function resolveCardDesign(input?: CardDesignInput): CardDesign {
  return {
    version: resolveValue("version", input?.version),
    layoutStyle: resolveCardLayoutStyle(input?.layoutStyle),
    cardStyle: resolveValue("cardStyle", input?.cardStyle),
    stampJourneyStyle: resolveStampJourneyStyle(input?.stampJourneyStyle),
    stampIcon: resolveStampIcon(input?.stampIcon),
    progressStyle: resolveValue("progressStyle", input?.progressStyle),
    typographyPreset: resolveTypographyPreset(input?.typographyPreset),
    backgroundStyle: resolveBackgroundStyle(input?.backgroundStyle),
    backgroundPattern: resolveBackgroundPattern(input?.backgroundPattern),
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

export const industryRecommendedStampIcons: Record<IndustryDesignPackId, readonly CardDesignStampIcon[]> = {
  BARBERSHOP: barbershopStampIcons,
  BEAUTY_SALON: beautySalonStampIcons,
  CAR_WASH: carWashStampIcons,
  CAFE: cafeStampIcons,
  RESTAURANT: restaurantStampIcons,
  GENERAL: generalStampIcons,
};

export function getRecommendedStampIconsForIndustry(industryPackId: IndustryDesignPackId): readonly CardDesignStampIcon[] {
  return industryRecommendedStampIcons[industryPackId] ?? generalStampIcons;
}

export function getRecommendedStampIconsForBusinessType(businessType?: BusinessType | null): readonly CardDesignStampIcon[] {
  return getRecommendedStampIconsForIndustry(getIndustryDesignPackId(businessType));
}

export function resolveIndustryCardDesign(businessType?: BusinessType | null, overrides?: CardDesignInput): CardDesign {
  const pack = getIndustryDesignPack(businessType);
  return resolveCardDesign({
    ...pack.cardDesign,
    ...overrides,
  });
}

export function getCardThemeForCardDesign(cardDesign: CardDesign): CardTheme {
  if (cardDesign.cardStyle === "modern-clean") return "COFFEE_CAFE";
  if (cardDesign.cardStyle === "premium-dark") return "RESTAURANT";
  if (cardDesign.cardStyle === "minimal-light") return "BEAUTY_SALON";
  if (cardDesign.cardStyle === "image-background") return "AUTOMOTIVE";
  return "BUSINESS_DEFAULT";
}

export function getIndustryDefaultCardTheme(businessType?: BusinessType | null): CardTheme {
  return getCardThemeForCardDesign(resolveIndustryCardDesign(businessType));
}
