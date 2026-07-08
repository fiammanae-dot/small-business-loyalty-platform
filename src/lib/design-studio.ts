import { z } from "zod";
import {
  generalStampIcons,
  defaultVisibleCardSections,
  getCardStyleForLayoutStyle,
  getCardThemeForLayoutStyle,
  getRecommendedStampIconsForBusinessType,
  industryDesignPacks,
  resolveCardDesign,
  stampIcons,
  type CardDesign,
  type CardDesignBackgroundPattern,
  type CardDesignBackgroundStyle,
  type CardDesignDecorationStyle,
  type CardDesignInput,
  type CardDesignLayoutStyle,
  type CardDesignRewardStyle,
  type CardSection,
  type CardSectionVisibility,
  type CardDesignStampIcon,
  type CardDesignStampJourneyStyle,
  type CardDesignTypographyPreset,
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

export const designStudioBackgroundStyleOptions = [
  { value: "SOLID", label: "Solid", description: "A clean single-tone card background." },
  { value: "GRADIENT", label: "Gradient", description: "A soft blended background with more depth." },
  { value: "PATTERN", label: "Pattern", description: "A subtle decorative direction for future card styles." },
] satisfies Array<{
  value: Extract<CardDesignBackgroundStyle, "SOLID" | "GRADIENT" | "PATTERN">;
  label: string;
  description: string;
}>;

export const designStudioBackgroundPatternOptions = [
  { value: "NONE", label: "None", description: "Keep the background simple." },
  { value: "SUBTLE_DOTS", label: "Subtle Dots", description: "Light dot texture for quiet depth." },
  { value: "DIAGONAL_LINES", label: "Diagonal Lines", description: "A crisp directional pattern." },
  { value: "WAVES", label: "Waves", description: "A smooth flowing pattern." },
  { value: "COFFEE_BEANS", label: "Coffee Beans", description: "Coffee-inspired detail for cafe programs." },
  { value: "SCISSORS", label: "Scissors", description: "Grooming-inspired detail for barbershops." },
  { value: "WATER_BUBBLES", label: "Water Bubbles", description: "Fresh detail for car wash programs." },
  { value: "FOOD_PATTERN", label: "Food Pattern", description: "Dining-inspired detail for restaurants." },
  { value: "BEAUTY_PATTERN", label: "Beauty Pattern", description: "Soft detail for salons and beauty programs." },
] satisfies Array<{
  value: CardDesignBackgroundPattern;
  label: string;
  description: string;
}>;

export type DesignStudioBackgroundGalleryOption = {
  id: string;
  label: string;
  description: string;
  backgroundStyle: Extract<CardDesignBackgroundStyle, "SOLID" | "GRADIENT" | "PATTERN">;
  backgroundPattern: CardDesignBackgroundPattern;
};

export const designStudioBackgroundGalleryOptions = [
  { id: "minimal-white", label: "Minimal White", description: "Clean, bright, and simple.", backgroundStyle: "SOLID", backgroundPattern: "NONE" },
  { id: "soft-gradient", label: "Soft Gradient", description: "Warm depth with a gentle blend.", backgroundStyle: "GRADIENT", backgroundPattern: "NONE" },
  { id: "dark-premium", label: "Dark Premium", description: "Bold contrast for a premium feel.", backgroundStyle: "GRADIENT", backgroundPattern: "NONE" },
  { id: "luxury-gold", label: "Luxury Gold", description: "Refined gold accents and movement.", backgroundStyle: "PATTERN", backgroundPattern: "DIAGONAL_LINES" },
  { id: "glass", label: "Glass", description: "Light translucent feel.", backgroundStyle: "GRADIENT", backgroundPattern: "NONE" },
  { id: "coffee-pattern", label: "Coffee Pattern", description: "Cafe-inspired loyalty texture.", backgroundStyle: "PATTERN", backgroundPattern: "COFFEE_BEANS" },
  { id: "salon-marble", label: "Salon Marble", description: "Soft beauty-inspired texture.", backgroundStyle: "PATTERN", backgroundPattern: "BEAUTY_PATTERN" },
  { id: "restaurant-texture", label: "Restaurant Texture", description: "Dining-inspired background detail.", backgroundStyle: "PATTERN", backgroundPattern: "FOOD_PATTERN" },
  { id: "modern-mesh", label: "Modern Mesh", description: "Contemporary flowing linework.", backgroundStyle: "PATTERN", backgroundPattern: "WAVES" },
  { id: "car-wash-bubbles", label: "Car Wash Bubbles", description: "Fresh bubbles for car care brands.", backgroundStyle: "PATTERN", backgroundPattern: "WATER_BUBBLES" },
] satisfies DesignStudioBackgroundGalleryOption[];

export function resolveDesignStudioBackgroundGalleryOption(
  backgroundStyle: CardDesignBackgroundStyle,
  backgroundPattern: CardDesignBackgroundPattern,
) {
  const normalizedStyle: Extract<CardDesignBackgroundStyle, "SOLID" | "GRADIENT" | "PATTERN"> =
    backgroundStyle === "GRADIENT" ? "GRADIENT" : backgroundStyle === "SOLID" ? "SOLID" : "PATTERN";
  return (
    designStudioBackgroundGalleryOptions.find((option) => option.backgroundStyle === normalizedStyle && option.backgroundPattern === backgroundPattern) ??
    (backgroundPattern !== "NONE" ? designStudioBackgroundGalleryOptions.find((option) => option.backgroundPattern === backgroundPattern) : undefined) ??
    designStudioBackgroundGalleryOptions.find((option) => option.backgroundStyle === normalizedStyle && option.backgroundPattern === "NONE") ??
    designStudioBackgroundGalleryOptions[0]
  );
}

export const designStudioRewardStyleOptions = [
  { value: "FILLED", label: "Filled", description: "Bold and easy to notice." },
  { value: "OUTLINE", label: "Outline", description: "Clean and lightweight." },
  { value: "GLASS", label: "Glass", description: "Modern translucent appearance." },
  { value: "PREMIUM", label: "Premium", description: "Elegant highlighted reward." },
  { value: "TICKET", label: "Ticket", description: "Looks like a redeemable coupon." },
] satisfies Array<{
  value: CardDesignRewardStyle;
  label: string;
  description: string;
}>;

export const designStudioTypographyOptions = [
  { value: "MODERN", label: "Modern", description: "Clean and contemporary." },
  { value: "LUXURY", label: "Elegant", description: "Refined and polished." },
  { value: "PLAYFUL", label: "Friendly", description: "Warm and approachable." },
  { value: "MINIMAL", label: "Minimal", description: "Simple and distraction-free." },
] satisfies Array<{
  value: CardDesignTypographyPreset;
  label: string;
  description: string;
}>;

export function resolveDesignStudioTypographyOption(typographyPreset: CardDesignTypographyPreset) {
  if (typographyPreset === "CLASSIC" || typographyPreset === "PREMIUM" || typographyPreset === "LUXURY") {
    return designStudioTypographyOptions.find((option) => option.value === "LUXURY") ?? designStudioTypographyOptions[1];
  }

  if (typographyPreset === "PLAYFUL") {
    return designStudioTypographyOptions.find((option) => option.value === "PLAYFUL") ?? designStudioTypographyOptions[2];
  }

  if (typographyPreset === "MINIMAL") {
    return designStudioTypographyOptions.find((option) => option.value === "MINIMAL") ?? designStudioTypographyOptions[3];
  }

  return designStudioTypographyOptions[0];
}

export const designStudioCardFinishOptions = [
  { value: "FLAT", label: "Flat", description: "Clean and distraction-free." },
  { value: "SOFT", label: "Soft", description: "Rounded corners with gentle shadows." },
  { value: "GLASS", label: "Glass", description: "Modern translucent appearance." },
  { value: "PREMIUM", label: "Premium", description: "Professional depth and refined accents." },
  { value: "LUXURY", label: "Luxury", description: "Elegant finish with premium visual emphasis." },
] satisfies Array<{
  value: CardDesignDecorationStyle;
  label: string;
  description: string;
}>;

export const designStudioCardContentOptions = [
  { value: "logo", label: "Business Logo", description: "Show the logo in the card header." },
  { value: "businessName", label: "Business Name", description: "Show your business name." },
  { value: "programName", label: "Program Name", description: "Show the loyalty program name." },
  { value: "customerName", label: "Customer Name", description: "Show the customer name." },
  { value: "tierBadge", label: "Tier Badge", description: "Show the customer tier." },
  { value: "rewardBox", label: "Reward Box", description: "Show the next reward panel." },
  { value: "progress", label: "Reward Progress", description: "Show loyalty progress." },
  { value: "visits", label: "Visits Remaining", description: "Show visits left to reward." },
  { value: "qr", label: "QR Code", description: "Show the scan QR section." },
  { value: "footer", label: "Footer Message", description: "Show the card footer message." },
  { value: "referral", label: "Referral Section", description: "Show referral information when available." },
] satisfies Array<{
  value: CardSection;
  label: string;
  description: string;
}>;

const content = (overrides: Partial<CardSectionVisibility> = {}): CardSectionVisibility => ({
  ...defaultVisibleCardSections,
  ...overrides,
});

function sectionVisibilityMatches(expected: CardSectionVisibility, actual: CardSectionVisibility) {
  return designStudioCardContentOptions.every((option) => expected[option.value] === actual[option.value]);
}

export type DesignStudioCardLayoutOption = {
  id: "compact" | "standard" | "detailed" | "premium";
  label: string;
  description: string;
  visibleSections: CardSectionVisibility;
};

export const designStudioCardLayoutOptions = [
  {
    id: "compact",
    label: "Compact",
    description: "Clean card with only essential loyalty details.",
    visibleSections: content({
      programName: false,
      tierBadge: false,
      rewardBox: false,
      footer: false,
      referral: false,
    }),
  },
  {
    id: "standard",
    label: "Standard",
    description: "Balanced layout for most businesses.",
    visibleSections: content({
      footer: false,
      referral: false,
    }),
  },
  {
    id: "detailed",
    label: "Detailed",
    description: "Shows extra customer and reward information.",
    visibleSections: content({
      referral: false,
    }),
  },
  {
    id: "premium",
    label: "Premium",
    description: "Full-featured layout with every available card section.",
    visibleSections: content(),
  },
] satisfies DesignStudioCardLayoutOption[];

export function resolveDesignStudioCardLayoutOption(visibleSections: CardSectionVisibility) {
  const exact = designStudioCardLayoutOptions.find((option) => sectionVisibilityMatches(option.visibleSections, visibleSections));
  if (exact) return exact;

  return designStudioCardLayoutOptions
    .map((option) => ({
      option,
      score: designStudioCardContentOptions.filter((section) => option.visibleSections[section.value] === visibleSections[section.value]).length,
    }))
    .sort((a, b) => b.score - a.score)[0]?.option ?? designStudioCardLayoutOptions[1];
}

export type DesignStudioProfessionalPreset = {
  id: string;
  category: string;
  name: string;
  description: string;
  layoutStyle: Extract<CardDesignLayoutStyle, "CLASSIC" | "MODERN" | "PREMIUM" | "LUXURY">;
  backgroundStyle: Extract<CardDesignBackgroundStyle, "SOLID" | "GRADIENT" | "PATTERN">;
  backgroundPattern: CardDesignBackgroundPattern;
  stampJourneyStyle: Extract<CardDesignStampJourneyStyle, "CIRCLES" | "CONNECTED_DOTS" | "PROGRESS_BAR">;
  stampIcon: CardDesignStampIcon;
  rewardStyle: CardDesignRewardStyle;
  typographyPreset: CardDesignTypographyPreset;
  decorationStyle: CardDesignDecorationStyle;
  visibleSections: CardSectionVisibility;
};

export const designStudioProfessionalPresetGroups = [
  {
    category: "Barbershop",
    presets: [
      preset("modern-barber", "Barbershop", "Modern Barber", "Sharp, clean and built for repeat grooming visits.", "MODERN", "PATTERN", "SCISSORS", "CONNECTED_DOTS", "SCISSORS", "OUTLINE", "PREMIUM", "PREMIUM"),
      preset("luxury-barber", "Barbershop", "Luxury Barber", "A dark refined look for premium grooming programs.", "LUXURY", "PATTERN", "DIAGONAL_LINES", "CONNECTED_DOTS", "BARBER_POLE", "PREMIUM", "LUXURY", "LUXURY"),
      preset("vintage-barber", "Barbershop", "Vintage Barber", "Classic barber character with clear stamp progress.", "CLASSIC", "PATTERN", "SCISSORS", "CIRCLES", "RAZOR", "TICKET", "CLASSIC", "SOFT"),
      preset("classic-barber", "Barbershop", "Classic Barber", "Familiar and practical for everyday loyalty cards.", "CLASSIC", "SOLID", "NONE", "CIRCLES", "SCISSORS", "FILLED", "MODERN", "SOFT"),
    ],
  },
  {
    category: "Beauty Salon",
    presets: [
      preset("rose-gold", "Beauty Salon", "Rose Gold", "Warm elegant styling for beauty and self-care rewards.", "LUXURY", "GRADIENT", "BEAUTY_PATTERN", "CIRCLES", "LIPSTICK", "GLASS", "LUXURY", "GLASS"),
      preset("luxury-beauty", "Beauty Salon", "Luxury Beauty", "Polished, high-end treatment for premium salon cards.", "LUXURY", "PATTERN", "BEAUTY_PATTERN", "CONNECTED_DOTS", "MAKEUP_BRUSH", "PREMIUM", "LUXURY", "LUXURY"),
      preset("elegant-spa", "Beauty Salon", "Elegant Spa", "Soft, calm and refined for spa-focused visits.", "CLASSIC", "PATTERN", "WAVES", "CIRCLES", "MIRROR", "OUTLINE", "CLASSIC", "SOFT"),
      preset("minimal-studio", "Beauty Salon", "Minimal Studio", "Quiet, spacious and distraction-free.", "MODERN", "SOLID", "NONE", "PROGRESS_BAR", "NAIL_POLISH", "OUTLINE", "MINIMAL", "FLAT"),
    ],
  },
  {
    category: "Café",
    presets: [
      preset("warm-espresso", "Café", "Warm Espresso", "Cozy cafe styling for frequent coffee visits.", "CLASSIC", "PATTERN", "COFFEE_BEANS", "CIRCLES", "COFFEE_CUP", "FILLED", "CLASSIC", "SOFT"),
      preset("modern-coffee", "Café", "Modern Coffee", "Clean and contemporary for modern coffee bars.", "MODERN", "GRADIENT", "SUBTLE_DOTS", "PROGRESS_BAR", "COFFEE_CUP", "OUTLINE", "MODERN", "PREMIUM"),
      preset("organic-cafe", "Café", "Organic Café", "Natural and friendly for neighborhood cafes.", "CLASSIC", "PATTERN", "WAVES", "CONNECTED_DOTS", "COFFEE_BEAN", "GLASS", "PLAYFUL", "SOFT"),
      preset("dark-roast", "Café", "Dark Roast", "Bold contrast for rich coffee reward programs.", "PREMIUM", "PATTERN", "COFFEE_BEANS", "PROGRESS_BAR", "ESPRESSO", "PREMIUM", "PREMIUM", "LUXURY"),
    ],
  },
  {
    category: "Restaurant",
    presets: [
      preset("fine-dining", "Restaurant", "Fine Dining", "Elegant and confident for elevated dining rewards.", "LUXURY", "PATTERN", "FOOD_PATTERN", "CONNECTED_DOTS", "CHEF_HAT", "PREMIUM", "LUXURY", "LUXURY"),
      preset("casual-kitchen", "Restaurant", "Casual Kitchen", "Friendly structure for everyday restaurant visits.", "CLASSIC", "SOLID", "NONE", "CIRCLES", "PLATE", "FILLED", "MODERN", "SOFT"),
      preset("street-food", "Restaurant", "Street Food", "Energetic, direct and easy to scan.", "MODERN", "PATTERN", "DIAGONAL_LINES", "PROGRESS_BAR", "BURGER", "TICKET", "PLAYFUL", "PREMIUM"),
      preset("chefs-choice", "Restaurant", "Chef's Choice", "Professional card styling with a strong reward focus.", "PREMIUM", "PATTERN", "FOOD_PATTERN", "CONNECTED_DOTS", "PLATE", "PREMIUM", "PREMIUM", "PREMIUM"),
    ],
  },
  {
    category: "Car Wash",
    presets: [
      preset("aqua-clean", "Car Wash", "Aqua Clean", "Fresh and clear for quick wash loyalty cards.", "MODERN", "PATTERN", "WATER_BUBBLES", "PROGRESS_BAR", "WATER_DROP", "FILLED", "MODERN", "SOFT"),
      preset("bubble-wash", "Car Wash", "Bubble Wash", "Friendly, playful and built around visible progress.", "CLASSIC", "PATTERN", "WATER_BUBBLES", "CIRCLES", "BUBBLES", "GLASS", "PLAYFUL", "GLASS"),
      preset("premium-detailing", "Car Wash", "Premium Detailing", "High-contrast card styling for detailing packages.", "PREMIUM", "GRADIENT", "DIAGONAL_LINES", "CONNECTED_DOTS", "CAR", "PREMIUM", "PREMIUM", "LUXURY"),
      preset("express-wash", "Car Wash", "Express Wash", "Fast, simple and optimized for repeat visits.", "MODERN", "SOLID", "NONE", "PROGRESS_BAR", "WHEEL", "OUTLINE", "MINIMAL", "FLAT"),
    ],
  },
  {
    category: "General",
    presets: [
      preset("modern-business", "General", "Modern Business", "Clean, flexible and suitable for most businesses.", "MODERN", "SOLID", "NONE", "PROGRESS_BAR", "STAR", "OUTLINE", "MODERN", "SOFT"),
      preset("professional", "General", "Professional", "Balanced professional styling with strong clarity.", "CLASSIC", "GRADIENT", "SUBTLE_DOTS", "CONNECTED_DOTS", "CHECK", "FILLED", "PREMIUM", "PREMIUM"),
      preset("premium-general", "General", "Premium", "Elevated card presence with refined emphasis.", "PREMIUM", "PATTERN", "DIAGONAL_LINES", "CONNECTED_DOTS", "DIAMOND", "PREMIUM", "PREMIUM", "LUXURY"),
      preset("minimal-general", "General", "Minimal", "Simple, quiet and focused on the essentials.", "MODERN", "SOLID", "NONE", "PROGRESS_BAR", "CIRCLE", "OUTLINE", "MINIMAL", "FLAT", content({ referral: false })),
    ],
  },
] satisfies Array<{ category: string; presets: DesignStudioProfessionalPreset[] }>;

export const designStudioProfessionalPresets = designStudioProfessionalPresetGroups.flatMap((group) => group.presets);

function preset(
  id: string,
  category: string,
  name: string,
  description: string,
  layoutStyle: DesignStudioProfessionalPreset["layoutStyle"],
  backgroundStyle: DesignStudioProfessionalPreset["backgroundStyle"],
  backgroundPattern: CardDesignBackgroundPattern,
  stampJourneyStyle: DesignStudioProfessionalPreset["stampJourneyStyle"],
  stampIcon: CardDesignStampIcon,
  rewardStyle: CardDesignRewardStyle,
  typographyPreset: CardDesignTypographyPreset,
  decorationStyle: CardDesignDecorationStyle,
  visibleSections: CardSectionVisibility = content(),
): DesignStudioProfessionalPreset {
  return {
    id,
    category,
    name,
    description,
    layoutStyle,
    backgroundStyle,
    backgroundPattern,
    stampJourneyStyle,
    stampIcon,
    rewardStyle,
    typographyPreset,
    decorationStyle,
    visibleSections,
  };
}

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
  backgroundStyle: z.enum(["SOLID", "GRADIENT", "PATTERN"]),
  backgroundPattern: z.enum(["NONE", "SUBTLE_DOTS", "DIAGONAL_LINES", "WAVES", "COFFEE_BEANS", "SCISSORS", "WATER_BUBBLES", "FOOD_PATTERN", "BEAUTY_PATTERN"]),
  rewardStyle: z.enum(["FILLED", "OUTLINE", "GLASS", "PREMIUM", "TICKET"]),
  typographyPreset: z.enum(["CLASSIC", "MODERN", "PREMIUM", "LUXURY", "PLAYFUL", "MINIMAL"]),
  decorationStyle: z.enum(["FLAT", "SOFT", "GLASS", "PREMIUM", "LUXURY"]),
  visibleSections: z.object({
    logo: z.boolean(),
    businessName: z.boolean(),
    customerName: z.boolean(),
    tierBadge: z.boolean(),
    rewardBox: z.boolean(),
    progress: z.boolean(),
    qr: z.boolean(),
    footer: z.boolean(),
    referral: z.boolean(),
    visits: z.boolean(),
    programName: z.boolean(),
  }),
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
    backgroundStyle: input.backgroundStyle,
    backgroundPattern: input.backgroundPattern,
    rewardStyle: input.rewardStyle,
    typographyPreset: input.typographyPreset,
    decorationStyle: input.decorationStyle,
    visibleSections: input.visibleSections,
  });
}

export function getAllowedStampIconsForBusinessType(businessType: Parameters<typeof getRecommendedStampIconsForBusinessType>[0]) {
  const industryStyleIcons = designStudioIndustryStyleOptions.map((option) => option.stampIcon);
  const professionalPresetIcons = designStudioProfessionalPresets.map((option) => option.stampIcon);
  return Array.from(new Set([...getRecommendedStampIconsForBusinessType(businessType), ...industryStyleIcons, ...professionalPresetIcons, ...generalStampIcons])).filter((icon): icon is CardDesignStampIcon =>
    (stampIcons as readonly string[]).includes(icon),
  );
}

export function parseDesignStudioForm(formData: FormData, businessType: Parameters<typeof getRecommendedStampIconsForBusinessType>[0]) {
  const getVisibleSectionValue = (section: CardSection) => {
    const value = formData.get(`visibleSections.${section}`);
    return value === null ? defaultVisibleCardSections[section] : value === "true";
  };

  const parsed = designStudioSchema.safeParse({
    layoutStyle: String(formData.get("layoutStyle") ?? ""),
    stampJourneyStyle: String(formData.get("stampJourneyStyle") ?? ""),
    stampIcon: String(formData.get("stampIcon") ?? ""),
    backgroundStyle: String(formData.get("backgroundStyle") ?? "SOLID"),
    backgroundPattern: String(formData.get("backgroundPattern") ?? "NONE"),
    rewardStyle: String(formData.get("rewardStyle") ?? "FILLED"),
    typographyPreset: String(formData.get("typographyPreset") ?? "MODERN"),
    decorationStyle: String(formData.get("decorationStyle") ?? "FLAT"),
    visibleSections: {
      logo: getVisibleSectionValue("logo"),
      businessName: getVisibleSectionValue("businessName"),
      customerName: getVisibleSectionValue("customerName"),
      tierBadge: getVisibleSectionValue("tierBadge"),
      rewardBox: getVisibleSectionValue("rewardBox"),
      progress: getVisibleSectionValue("progress"),
      qr: getVisibleSectionValue("qr"),
      footer: getVisibleSectionValue("footer"),
      referral: getVisibleSectionValue("referral"),
      visits: getVisibleSectionValue("visits"),
      programName: getVisibleSectionValue("programName"),
    },
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
