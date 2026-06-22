import type { CardTheme } from "@prisma/client";

export type CardThemeDefinition = {
  value: CardTheme;
  label: string;
  description: string;
  accent: string;
  secondary: string;
  surface: string;
  motif: string;
};

export const cardThemeOptions: CardThemeDefinition[] = [
  {
    value: "BUSINESS_DEFAULT",
    label: "Business Default",
    description: "Uses your business branding colors and keeps the card neutral.",
    accent: "var(--business-primary, #F97316)",
    secondary: "var(--business-secondary, #EA580C)",
    surface: "#FFF7ED",
    motif: "Brand",
  },
  {
    value: "COFFEE_CAFE",
    label: "Coffee & Cafe",
    description: "Warm coffee tones for cafes, bakeries, and drink concepts.",
    accent: "#7C2D12",
    secondary: "#F97316",
    surface: "#FFF7ED",
    motif: "Coffee",
  },
  {
    value: "RESTAURANT",
    label: "Restaurant",
    description: "Rich dining colors for restaurants and food service brands.",
    accent: "#B91C1C",
    secondary: "#F59E0B",
    surface: "#FEF2F2",
    motif: "Dining",
  },
  {
    value: "BEAUTY_SALON",
    label: "Beauty & Salon",
    description: "Soft premium styling for salons, spas, and beauty services.",
    accent: "#BE185D",
    secondary: "#A855F7",
    surface: "#FDF2F8",
    motif: "Glow",
  },
  {
    value: "AUTOMOTIVE",
    label: "Automotive",
    description: "Clean, bold styling for car wash and automotive services.",
    accent: "#0F766E",
    secondary: "#0284C7",
    surface: "#ECFEFF",
    motif: "Auto",
  },
  {
    value: "RETAIL_GENERAL",
    label: "Retail & General",
    description: "Flexible retail styling for shops and general loyalty programs.",
    accent: "#4338CA",
    secondary: "#06B6D4",
    surface: "#EEF2FF",
    motif: "Retail",
  },
];

export function getCardThemeDefinition(value?: CardTheme | null) {
  return cardThemeOptions.find((theme) => theme.value === value) ?? cardThemeOptions[0];
}

export function resolveCardThemeColors({
  cardTheme,
  branding,
}: {
  cardTheme?: CardTheme | null;
  branding: { primaryColor: string; secondaryColor: string; backgroundColor: string; textColor: string; buttonColor: string };
}) {
  const theme = getCardThemeDefinition(cardTheme);
  if (theme.value === "BUSINESS_DEFAULT") {
    return {
      ...theme,
      accent: branding.primaryColor,
      secondary: branding.secondaryColor,
      surface: branding.backgroundColor,
      button: branding.buttonColor,
      text: branding.textColor,
    };
  }

  return {
    ...theme,
    button: branding.buttonColor,
    text: branding.textColor,
  };
}
