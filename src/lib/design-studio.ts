import { z } from "zod";
import {
  generalStampIcons,
  getCardStyleForLayoutStyle,
  getCardThemeForLayoutStyle,
  getRecommendedStampIconsForBusinessType,
  resolveCardDesign,
  type CardDesign,
  type CardDesignInput,
} from "@/lib/card-design";

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
  return Array.from(new Set([...getRecommendedStampIconsForBusinessType(businessType), ...generalStampIcons]));
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
