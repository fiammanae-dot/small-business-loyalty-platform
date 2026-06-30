import type { BusinessType } from "@prisma/client";
import {
  backgroundPatternPresets,
  barbershopStampIcons,
  beautySalonStampIcons,
  cafeStampIcons,
  cardBackgroundStyles,
  cardLayoutStyles,
  carWashStampIcons,
  generalStampIcons,
  getIndustryDesignPackId,
  restaurantStampIcons,
  stampJourneyStyles,
  typographyPresets,
  type CardDesignBackgroundPattern,
  type CardDesignBackgroundStyle,
  type CardDesignLayoutStyle,
  type CardDesignStampIcon,
  type CardDesignStampJourneyStyle,
  type CardDesignTypographyPreset,
  type IndustryDesignPackId,
} from "@/lib/card-design";

export const assetCategories = ["LAYOUT", "STAMP_ICON", "BACKGROUND", "PATTERN", "TYPOGRAPHY", "STAMP_JOURNEY"] as const;
export type AssetCategory = (typeof assetCategories)[number];
export type AssetIndustry = IndustryDesignPackId | "ALL";

export type Asset = {
  id: string;
  category: AssetCategory;
  industry: AssetIndustry;
  label: string;
  description: string;
  previewKey: string;
  futureSvgKey: string | null;
  futureAnimationKey: string | null;
};

export type IndustryAssetDefaults = {
  layout: string;
  stampIcon: string;
  background: string;
  pattern: string;
  typography: string;
  stampJourney: string;
};

const labelize = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const assetId = (category: AssetCategory, value: string) => `${category.toLowerCase()}:${value.toLowerCase().replaceAll("_", "-")}`;

function buildAsset({ category, value, industry = "ALL", description }: { category: AssetCategory; value: string; industry?: AssetIndustry; description: string }): Asset {
  return {
    id: assetId(category, value),
    category,
    industry,
    label: labelize(value),
    description,
    previewKey: value.toLowerCase().replaceAll("_", "-"),
    futureSvgKey: null,
    futureAnimationKey: null,
  };
}

const stampIconIndustryGroups: Array<{ industry: AssetIndustry; icons: readonly CardDesignStampIcon[]; description: string }> = [
  { industry: "GENERAL", icons: generalStampIcons, description: "General-purpose loyalty stamp icon." },
  { industry: "BARBERSHOP", icons: barbershopStampIcons, description: "Barbershop-focused loyalty stamp icon." },
  { industry: "BEAUTY_SALON", icons: beautySalonStampIcons, description: "Beauty and salon loyalty stamp icon." },
  { industry: "CAFE", icons: cafeStampIcons, description: "Cafe and coffee loyalty stamp icon." },
  { industry: "RESTAURANT", icons: restaurantStampIcons, description: "Restaurant loyalty stamp icon." },
  { industry: "CAR_WASH", icons: carWashStampIcons, description: "Car wash and car care loyalty stamp icon." },
];

export const assetCatalog: readonly Asset[] = [
  ...cardLayoutStyles.map((value: CardDesignLayoutStyle) =>
    buildAsset({
      category: "LAYOUT",
      value,
      description: "Card layout structure available for future Design Studio templates.",
    }),
  ),
  ...stampIconIndustryGroups.flatMap(({ industry, icons, description }) => icons.map((value) => buildAsset({ category: "STAMP_ICON", value, industry, description }))),
  ...cardBackgroundStyles
    .filter((value): value is Exclude<CardDesignBackgroundStyle, "INDUSTRY_PATTERN"> => value !== "INDUSTRY_PATTERN")
    .map((value) =>
      buildAsset({
        category: "BACKGROUND",
        value,
        description: "Card background type available for future Design Studio customization.",
      }),
    ),
  ...backgroundPatternPresets.map((value: CardDesignBackgroundPattern) =>
    buildAsset({
      category: "PATTERN",
      value,
      description: "Card background pattern preset for future Design Studio customization.",
    }),
  ),
  ...typographyPresets.map((value: CardDesignTypographyPreset) =>
    buildAsset({
      category: "TYPOGRAPHY",
      value,
      description: "Typography preset available for future card text styling.",
    }),
  ),
  ...stampJourneyStyles.map((value: CardDesignStampJourneyStyle) =>
    buildAsset({
      category: "STAMP_JOURNEY",
      value,
      description: "Stamp journey visualization available for future progress rendering.",
    }),
  ),
] as const;

export const industryAssetDefaults: Record<IndustryDesignPackId, IndustryAssetDefaults> = {
  BARBERSHOP: {
    layout: assetId("LAYOUT", "CLASSIC"),
    stampIcon: assetId("STAMP_ICON", "SCISSORS"),
    background: assetId("BACKGROUND", "PATTERN"),
    pattern: assetId("PATTERN", "SCISSORS"),
    typography: assetId("TYPOGRAPHY", "PREMIUM"),
    stampJourney: assetId("STAMP_JOURNEY", "CIRCLES"),
  },
  BEAUTY_SALON: {
    layout: assetId("LAYOUT", "CLASSIC"),
    stampIcon: assetId("STAMP_ICON", "LIPSTICK"),
    background: assetId("BACKGROUND", "PATTERN"),
    pattern: assetId("PATTERN", "BEAUTY_PATTERN"),
    typography: assetId("TYPOGRAPHY", "LUXURY"),
    stampJourney: assetId("STAMP_JOURNEY", "CIRCLES"),
  },
  CAR_WASH: {
    layout: assetId("LAYOUT", "CLASSIC"),
    stampIcon: assetId("STAMP_ICON", "WATER_DROP"),
    background: assetId("BACKGROUND", "PATTERN"),
    pattern: assetId("PATTERN", "WATER_BUBBLES"),
    typography: assetId("TYPOGRAPHY", "MODERN"),
    stampJourney: assetId("STAMP_JOURNEY", "CIRCLES"),
  },
  CAFE: {
    layout: assetId("LAYOUT", "CLASSIC"),
    stampIcon: assetId("STAMP_ICON", "COFFEE_CUP"),
    background: assetId("BACKGROUND", "PATTERN"),
    pattern: assetId("PATTERN", "COFFEE_BEANS"),
    typography: assetId("TYPOGRAPHY", "CLASSIC"),
    stampJourney: assetId("STAMP_JOURNEY", "CIRCLES"),
  },
  RESTAURANT: {
    layout: assetId("LAYOUT", "CLASSIC"),
    stampIcon: assetId("STAMP_ICON", "PLATE"),
    background: assetId("BACKGROUND", "PATTERN"),
    pattern: assetId("PATTERN", "FOOD_PATTERN"),
    typography: assetId("TYPOGRAPHY", "PREMIUM"),
    stampJourney: assetId("STAMP_JOURNEY", "CIRCLES"),
  },
  GENERAL: {
    layout: assetId("LAYOUT", "CLASSIC"),
    stampIcon: assetId("STAMP_ICON", "STAR"),
    background: assetId("BACKGROUND", "SOLID"),
    pattern: assetId("PATTERN", "NONE"),
    typography: assetId("TYPOGRAPHY", "MODERN"),
    stampJourney: assetId("STAMP_JOURNEY", "CIRCLES"),
  },
};

export function getAssetsByCategory(category: AssetCategory): readonly Asset[] {
  return assetCatalog.filter((asset) => asset.category === category);
}

export function getAssetsByIndustry(industry: AssetIndustry): readonly Asset[] {
  return assetCatalog.filter((asset) => asset.industry === industry || asset.industry === "ALL");
}

export function getAsset(id: string): Asset | null {
  return assetCatalog.find((asset) => asset.id === id) ?? null;
}

export function getDuplicateAssetIds(catalog: readonly Pick<Asset, "id">[] = assetCatalog): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const asset of catalog) {
    if (seen.has(asset.id)) {
      duplicates.add(asset.id);
    }
    seen.add(asset.id);
  }

  return [...duplicates];
}

export function getDefaultAssetsForIndustry(industryOrBusinessType?: IndustryDesignPackId | BusinessType | null): IndustryAssetDefaults {
  const industry = isIndustryDesignPackId(industryOrBusinessType) ? industryOrBusinessType : getIndustryDesignPackId(industryOrBusinessType);
  return industryAssetDefaults[industry] ?? industryAssetDefaults.GENERAL;
}

function isIndustryDesignPackId(value: unknown): value is IndustryDesignPackId {
  return typeof value === "string" && value in industryAssetDefaults;
}
