import { z } from "zod";
import {
  defaultVisibleCardSections,
  generalStampIcons,
  getCardStyleForLayoutStyle,
  getCardThemeForLayoutStyle,
  getRecommendedStampIconsForBusinessType,
  resolveCardDesign,
  resolveCustomStampIconUrl,
  stampIcons,
  type CardDesign,
  type CardDesignInput,
  type CardDesignStampIcon,
} from "@/lib/card-design";

/**
 * What a business designs for a card: the parts a wallet pass can show. Apple
 * and Google Wallet paint a pass with one solid colour and a stamp picture, so
 * the design is a colour (layoutStyle) and a stamp icon. Older designs may hold
 * other fields (backgrounds, fonts, reward-box styles...) that no wallet could
 * render; a save writes them back to fixed values (walletCanonicalDesign).
 */
export const designStudioSchema = z.object({
  layoutStyle: z.enum(["CLASSIC", "MODERN", "PREMIUM", "LUXURY"]),
  stampIcon: z.enum(stampIcons),
  /** The business's own uploaded stamp icon; null = use the built-in stampIcon. */
  customStampIconUrl: z.string().nullable(),
});

/** The fixed values for the design fields a wallet cannot show. */
export const walletCanonicalDesign = {
  stampJourneyStyle: "ICON_GRID",
  progressStyle: "linear",
  typographyPreset: "MODERN",
  backgroundStyle: "SOLID",
  backgroundPattern: "NONE",
  decorationStyle: "FLAT",
  rewardStyle: "FILLED",
  visibleSections: defaultVisibleCardSections,
} as const satisfies Partial<CardDesign>;

export function buildProgramCardDesign(input: z.infer<typeof designStudioSchema>, existingDesign?: CardDesignInput): CardDesign {
  return resolveCardDesign({
    ...resolveCardDesign(existingDesign),
    ...walletCanonicalDesign,
    visibleSections: { ...defaultVisibleCardSections },
    layoutStyle: input.layoutStyle,
    cardStyle: getCardStyleForLayoutStyle(input.layoutStyle),
    stampIcon: input.stampIcon,
    customStampIconUrl: input.customStampIconUrl,
  });
}

/**
 * Icons every business may pick on top of its own industry's recommendations:
 * each industry's signature icon and the common cross-industry ones. (This is
 * the list the retired Design Studio templates used to contribute, kept so no
 * business loses an icon it could already choose.)
 */
const crossIndustryStampIcons: readonly CardDesignStampIcon[] = [
  "SCISSORS", "LIPSTICK", "WATER_DROP", "COFFEE_CUP", "PLATE", "STAR", "BARBER_POLE", "RAZOR", "MAKEUP_BRUSH", "MIRROR", "NAIL_POLISH",
  "COFFEE_BEAN", "ESPRESSO", "CHEF_HAT", "BURGER", "BUBBLES", "CAR", "WHEEL", "CHECK", "DIAMOND", "CIRCLE",
];

export function getAllowedStampIconsForBusinessType(businessType: Parameters<typeof getRecommendedStampIconsForBusinessType>[0]) {
  return Array.from(new Set([...getRecommendedStampIconsForBusinessType(businessType), ...crossIndustryStampIcons, ...generalStampIcons])).filter(
    (icon): icon is CardDesignStampIcon => (stampIcons as readonly string[]).includes(icon),
  );
}

export function parseDesignStudioForm(formData: FormData, businessType: Parameters<typeof getRecommendedStampIconsForBusinessType>[0]) {
  // MINIMAL is a legacy layout that renders exactly like CLASSIC (brand colour).
  const rawLayout = String(formData.get("layoutStyle") ?? "");
  const parsed = designStudioSchema.safeParse({
    layoutStyle: rawLayout === "MINIMAL" ? "CLASSIC" : rawLayout,
    stampIcon: String(formData.get("stampIcon") ?? ""),
    customStampIconUrl: parseCustomStampIconUrl(formData.get("customStampIconUrl")),
  });
  if (!parsed.success) return parsed;

  const allowedIcons = getAllowedStampIconsForBusinessType(businessType);
  if (!allowedIcons.includes(parsed.data.stampIcon as (typeof allowedIcons)[number])) {
    return designStudioSchema.safeParse({ ...parsed.data, stampIcon: "" });
  }

  return parsed;
}

/**
 * An uploaded stamp icon is only accepted from the platform's own icon storage,
 * so a design can never point the wallets at an arbitrary address.
 */
function parseCustomStampIconUrl(value: FormDataEntryValue | null): string | null {
  const url = resolveCustomStampIconUrl(typeof value === "string" ? value : null);
  if (!url) return null;
  const storageBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  return storageBase && url.startsWith(`${storageBase}/stamp-icons/`) ? url : null;
}

export function getCardThemeForDesignStudioTemplate(layoutStyle: z.infer<typeof designStudioSchema>["layoutStyle"]) {
  return getCardThemeForLayoutStyle(layoutStyle);
}
