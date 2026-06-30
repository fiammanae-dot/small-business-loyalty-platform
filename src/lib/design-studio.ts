import { z } from "zod";
import {
  generalStampIcons,
  getCardStyleForLayoutStyle,
  getCardThemeForLayoutStyle,
  getRecommendedStampIconsForBusinessType,
  industryDesignPacks,
  resolveCardDesign,
  stampIcons,
  type CardDesign,
  type CardDesignInput,
  type CardDesignLayoutStyle,
  type CardDesignStampIcon,
  type CardDesignStampJourneyStyle,
  type IndustryDesignPackId,
} from "@/lib/card-design";
import { getDefaultAssetsForIndustry } from "@/lib/card-asset-catalog";

export const designStudioTemplateOptions = [
  { value: "CLASSIC", label: "Classic", description: "Balanced design suitable for any business." },
  { value: "MODERN", label: "Modern", description: "Clean layout with generous spacing and a contemporary feel." },
  { value: "PREMIUM", label: "Premium", description: "High-contrast style that stands out and feels professional." },
  { value: "LUXURY", label: "Luxury", description: "Elegant dark treatment with refined visual emphasis." },
] as const;

export const designStudioStampJourneyOptions = [
  { value: "CIRCLES", label: "Circles", description: "Simple stamp circles for familiar loyalty cards." },
  { value: "CONNECTED_DOTS", label: "Connected Dots", description: "A connected journey style for future progress rendering." },
  { value: "PROGRESS_BAR", label: "Progress Bar", description: "A compact bar-first journey style for future rendering." },
] as const;

export const designStudioIndustryStyleOptions = [
  {
    id: "BARBERSHOP",
    label: "Barbershop",
    description: "Sharp, confident styling for repeat grooming visits.",
    layoutStyle: "PREMIUM",
    stampJourneyStyle: "CONNECTED_DOTS",
    stampIcon: industryDesignPacks.BARBERSHOP.cardDesign.stampIcon,
    stampIconLabel: "Scissors",
    stylePersonality: "Premium",
    assetDefaults: getDefaultAssetsForIndustry("BARBERSHOP"),
  },
  {
    id: "BEAUTY_SALON",
    label: "Beauty Salon",
    description: "Elegant styling for beauty, salon, and self-care rewards.",
    layoutStyle: "LUXURY",
    stampJourneyStyle: "CIRCLES",
    stampIcon: industryDesignPacks.BEAUTY_SALON.cardDesign.stampIcon,
    stampIconLabel: "Lipstick",
    stylePersonality: "Luxury",
    assetDefaults: getDefaultAssetsForIndustry("BEAUTY_SALON"),
  },
  {
    id: "CAR_WASH",
    label: "Car Wash",
    description: "Clean, energetic styling for car wash and care programs.",
    layoutStyle: "MODERN",
    stampJourneyStyle: "PROGRESS_BAR",
    stampIcon: industryDesignPacks.CAR_WASH.cardDesign.stampIcon,
    stampIconLabel: "Water Drop",
    stylePersonality: "Modern",
    assetDefaults: getDefaultAssetsForIndustry("CAR_WASH"),
  },
  {
    id: "CAFE",
    label: "Café",
    description: "Warm, familiar styling for coffee and everyday visits.",
    layoutStyle: "CLASSIC",
    stampJourneyStyle: "CIRCLES",
    stampIcon: industryDesignPacks.CAFE.cardDesign.stampIcon,
    stampIconLabel: "Coffee Cup",
    stylePersonality: "Classic",
    assetDefaults: getDefaultAssetsForIndustry("CAFE"),
  },
  {
    id: "RESTAURANT",
    label: "Restaurant",
    description: "Bold styling for dining rewards and guest loyalty.",
    layoutStyle: "PREMIUM",
    stampJourneyStyle: "PROGRESS_BAR",
    stampIcon: industryDesignPacks.RESTAURANT.cardDesign.stampIcon,
    stampIconLabel: "Plate",
    stylePersonality: "Premium",
    assetDefaults: getDefaultAssetsForIndustry("RESTAURANT"),
  },
  {
    id: "GENERAL",
    label: "General",
    description: "Flexible styling that works for most local businesses.",
    layoutStyle: "CLASSIC",
    stampJourneyStyle: "CIRCLES",
    stampIcon: industryDesignPacks.GENERAL.cardDesign.stampIcon,
    stampIconLabel: "Star",
    stylePersonality: "Classic",
    assetDefaults: getDefaultAssetsForIndustry("GENERAL"),
  },
] satisfies Array<{
  id: IndustryDesignPackId;
  label: string;
  description: string;
  layoutStyle: CardDesignLayoutStyle;
  stampJourneyStyle: Extract<CardDesignStampJourneyStyle, "CIRCLES" | "CONNECTED_DOTS" | "PROGRESS_BAR">;
  stampIcon: CardDesignStampIcon;
  stampIconLabel: string;
  stylePersonality: string;
  assetDefaults: ReturnType<typeof getDefaultAssetsForIndustry>;
}>;

export const designStudioSchema = z.object({
  layoutStyle: z.enum(["CLASSIC", "MODERN", "PREMIUM", "LUXURY"]),
  stampJourneyStyle: z.enum(["CIRCLES", "CONNECTED_DOTS", "PROGRESS_BAR"]),
  stampIcon: z.string().trim().min(1),
});

export function resolveProgramCardDesign(input?: CardDesignInput): CardDesign {
  return resolveCardDesign(input);
}

export function buildProgramCardDesign(input: z.infer<typeof designStudioSchema>, existingDesign?: CardDesignInput): CardDesign {
  return resolveCardDesign({
    ...resolveProgramCardDesign(existingDesign),
    layoutStyle: input.layoutStyle,
    cardStyle: getCardStyleForLayoutStyle(input.layoutStyle),
    stampJourneyStyle: input.stampJourneyStyle,
    stampIcon: input.stampIcon,
  });
}

export function getAllowedStampIconsForBusinessType(businessType: Parameters<typeof getRecommendedStampIconsForBusinessType>[0]) {
  const industryStyleIcons = designStudioIndustryStyleOptions.map((option) => option.stampIcon);
  return Array.from(new Set([...getRecommendedStampIconsForBusinessType(businessType), ...industryStyleIcons, ...generalStampIcons])).filter((icon): icon is CardDesignStampIcon =>
    (stampIcons as readonly string[]).includes(icon),
  );
}

export function parseDesignStudioForm(formData: FormData, businessType: Parameters<typeof getRecommendedStampIconsForBusinessType>[0]) {
  const parsed = designStudioSchema.safeParse({
    layoutStyle: String(formData.get("layoutStyle") ?? ""),
    stampJourneyStyle: String(formData.get("stampJourneyStyle") ?? ""),
    stampIcon: String(formData.get("stampIcon") ?? ""),
  });
  if (!parsed.success) return parsed;

  const allowedIcons = getAllowedStampIconsForBusinessType(businessType);
  if (!allowedIcons.includes(parsed.data.stampIcon as (typeof allowedIcons)[number])) {
    return designStudioSchema.safeParse({ ...parsed.data, stampIcon: "" });
  }

  return parsed;
}

export function getCardThemeForDesignStudioTemplate(layoutStyle: z.infer<typeof designStudioSchema>["layoutStyle"]) {
  return getCardThemeForLayoutStyle(layoutStyle);
}
