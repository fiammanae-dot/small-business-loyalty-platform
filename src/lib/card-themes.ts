import type { CardTheme } from "@prisma/client";
import type { CardDesignInput } from "@/lib/card-design";
import { getCardThemeForCardDesign, resolveCardDesign } from "@/lib/card-design";
import { DARK_FOREGROUND, getReadableForeground, hasReadableContrast } from "@/lib/color-contrast";

export type WalletVisualStyle = "modern-clean" | "premium-dark" | "minimal-light" | "image-background";

export type WalletThemeTokens = {
  style: WalletVisualStyle;
  eyebrow: string;
  label: string;
  description: string;
  accent: string;
  secondary: string;
  surface: string;
  pageBackground: string;
  cardBackground: string;
  cardText: string;
  mutedText: string;
  panelBackground: string;
  border: string;
  qrSurface: string;
  radius: string;
  innerRadius: string;
  shadow: string;
  phoneBackground: string;
  phoneRadius: string;
  phoneShadow: string;
  logoBackground: string;
  logoText: string;
  badgeBackground: string;
  badgeText: string;
  badgeBorder: string;
  rewardPanelBackground: string;
  rewardPanelText: string;
  rewardPanelMuted: string;
  rewardPanelBorder: string;
  progressTrack: string;
  progressFill: string;
  ctaBackground: string;
  ctaForeground: string;
  decorative: string;
  button: string;
  text: string;
};

export type CardThemeDefinition = WalletThemeTokens & {
  value: CardTheme;
  motif: string;
};

type BrandingInput = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
};

export const walletStyleTokens: Record<WalletVisualStyle, Omit<WalletThemeTokens, "button" | "text">> = {
  "modern-clean": {
    style: "modern-clean",
    eyebrow: "Modern Clean",
    label: "Modern Clean",
    description: "Bright, polished and brand-led with soft gradients and clear QR focus.",
    accent: "#F97316",
    secondary: "#34D399",
    surface: "#FFF1E8",
    pageBackground: "#F7F7F5",
    cardBackground: "linear-gradient(180deg, #11383f 0%, #0b2025 100%)",
    cardText: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.80)",
    panelBackground: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.10)",
    qrSurface: "#FFFFFF",
    radius: "32px",
    innerRadius: "16px",
    shadow: "0 30px 60px rgba(15, 23, 42, 0.10), 0 8px 18px rgba(15, 23, 42, 0.06)",
    phoneBackground: "#0F1720",
    phoneRadius: "40px",
    phoneShadow: "0 40px 80px rgba(15, 23, 42, 0.18), 0 12px 26px rgba(15, 23, 42, 0.10)",
    logoBackground: "#FFFFFF",
    logoText: "#0F172A",
    badgeBackground: "rgba(255,255,255,0.10)",
    badgeText: "#FFFFFF",
    badgeBorder: "rgba(249,115,22,0.10)",
    rewardPanelBackground: "#FFFFFF",
    rewardPanelText: "#121212",
    rewardPanelMuted: "#6B7280",
    rewardPanelBorder: "rgba(15, 23, 42, 0.06)",
    progressTrack: "rgba(255,255,255,0.25)",
    progressFill: "#34D399",
    ctaBackground: "#34D399",
    ctaForeground: "#111827",
    decorative: "transparent",
  },
  "premium-dark": {
    style: "premium-dark",
    eyebrow: "Premium Dark",
    label: "Premium Dark",
    description: "Deep premium card styling with high contrast, glow, and luxury weight.",
    accent: "#D97706",
    secondary: "#FBBF24",
    surface: "#111827",
    pageBackground: "#F7F7F5",
    cardBackground: "linear-gradient(180deg, #1f1f20 0%, #121212 100%)",
    cardText: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.70)",
    panelBackground: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.25)",
    qrSurface: "#FFFFFF",
    radius: "32px",
    innerRadius: "16px",
    shadow: "0 30px 60px rgba(15, 23, 42, 0.10), 0 8px 18px rgba(15, 23, 42, 0.06)",
    phoneBackground: "#0F1720",
    phoneRadius: "40px",
    phoneShadow: "0 40px 80px rgba(15, 23, 42, 0.18), 0 12px 26px rgba(15, 23, 42, 0.10)",
    logoBackground: "#FFFFFF",
    logoText: "#0F172A",
    badgeBackground: "rgba(251,191,36,0.12)",
    badgeText: "#FCD34D",
    badgeBorder: "rgba(251,191,36,0.25)",
    rewardPanelBackground: "#181818",
    rewardPanelText: "#FDE68A",
    rewardPanelMuted: "rgba(253,230,138,0.70)",
    rewardPanelBorder: "rgba(251,191,36,0.40)",
    progressTrack: "rgba(255,255,255,0.15)",
    progressFill: "#FBBF24",
    ctaBackground: "#FBBF24",
    ctaForeground: "#111827",
    decorative: "transparent",
  },
  "minimal-light": {
    style: "minimal-light",
    eyebrow: "Minimal Light",
    label: "Minimal Light",
    description: "Quiet editorial card with generous whitespace, crisp borders, and restrained color.",
    accent: "#F97316",
    secondary: "#F97316",
    surface: "#FFF1E8",
    pageBackground: "#F7F7F5",
    cardBackground: "#FFFFFF",
    cardText: "#121212",
    mutedText: "#6B7280",
    panelBackground: "#FFF1E8",
    border: "#E5E7EB",
    qrSurface: "#FFFFFF",
    radius: "32px",
    innerRadius: "16px",
    shadow: "0 30px 60px rgba(15, 23, 42, 0.10), 0 8px 18px rgba(15, 23, 42, 0.06)",
    phoneBackground: "#0F1720",
    phoneRadius: "40px",
    phoneShadow: "0 40px 80px rgba(15, 23, 42, 0.18), 0 12px 26px rgba(15, 23, 42, 0.10)",
    logoBackground: "#FFF1E8",
    logoText: "#EA580C",
    badgeBackground: "#FFF1E8",
    badgeText: "#EA580C",
    badgeBorder: "#FED7AA",
    rewardPanelBackground: "#E9F7EE",
    rewardPanelText: "#14532D",
    rewardPanelMuted: "rgba(21,128,61,0.70)",
    rewardPanelBorder: "#DCFCE7",
    progressTrack: "#E5E7EB",
    progressFill: "#F97316",
    ctaBackground: "#F97316",
    ctaForeground: "#111827",
    decorative: "transparent",
  },
  "image-background": {
    style: "image-background",
    eyebrow: "Image Background",
    label: "Image Background",
    description: "Immersive visual-card treatment with brand color overlays and a photo-ready feel.",
    accent: "#F5D2A7",
    secondary: "#E9C18D",
    surface: "#FFF7ED",
    pageBackground: "#F7F7F5",
    cardBackground: "linear-gradient(180deg, rgba(62,38,18,0.30), rgba(25,15,8,0.70)), radial-gradient(circle at 22% 10%, rgba(245,210,167,0.34), transparent 30%), linear-gradient(135deg, #7C4A24, #1A1008)",
    cardText: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.85)",
    panelBackground: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.15)",
    qrSurface: "#FFFFFF",
    radius: "32px",
    innerRadius: "16px",
    shadow: "0 30px 60px rgba(15, 23, 42, 0.10), 0 8px 18px rgba(15, 23, 42, 0.06)",
    phoneBackground: "#0F1720",
    phoneRadius: "40px",
    phoneShadow: "0 40px 80px rgba(15, 23, 42, 0.18), 0 12px 26px rgba(15, 23, 42, 0.10)",
    logoBackground: "#FFFFFF",
    logoText: "#0F172A",
    badgeBackground: "rgba(255,255,255,0.10)",
    badgeText: "#FEF3C7",
    badgeBorder: "rgba(255,255,255,0.15)",
    rewardPanelBackground: "#E9C18D",
    rewardPanelText: "#121212",
    rewardPanelMuted: "rgba(51,65,85,0.70)",
    rewardPanelBorder: "rgba(15,23,42,0.06)",
    progressTrack: "rgba(255,255,255,0.20)",
    progressFill: "#F5D2A7",
    ctaBackground: "#F5D2A7",
    ctaForeground: "#111827",
    decorative: "transparent",
  },
};

export const cardThemeOptions: CardThemeDefinition[] = [
  {
    value: "BUSINESS_DEFAULT",
    motif: "Brand",
    ...walletStyleTokens["modern-clean"],
    label: "Business Default",
    description: "Uses your business brand colors with the Modern Clean wallet style.",
  },
  {
    value: "COFFEE_CAFE",
    motif: "Clean",
    ...walletStyleTokens["modern-clean"],
  },
  {
    value: "RESTAURANT",
    motif: "Premium",
    ...walletStyleTokens["premium-dark"],
  },
  {
    value: "BEAUTY_SALON",
    motif: "Minimal",
    ...walletStyleTokens["minimal-light"],
  },
  {
    value: "AUTOMOTIVE",
    motif: "Image",
    ...walletStyleTokens["image-background"],
  },
];

const legacyThemeFallbacks: Partial<Record<CardTheme, CardThemeDefinition>> = {
  RETAIL_GENERAL: cardThemeOptions[1],
};

export function getCardThemeDefinition(value?: CardTheme | null) {
  return cardThemeOptions.find((theme) => theme.value === value) ?? (value ? legacyThemeFallbacks[value] : undefined) ?? cardThemeOptions[0];
}

export function resolveCardThemeColors({
  cardTheme,
  branding,
  cardDesign,
}: {
  cardTheme?: CardTheme | null;
  branding: BrandingInput;
  cardDesign?: CardDesignInput;
}) {
  const design = resolveCardDesign(cardDesign);
  const theme = getCardThemeDefinition(cardDesign ? getCardThemeForCardDesign(design) : cardTheme);
  if (theme.value === "BUSINESS_DEFAULT") {
    const primaryForeground = getReadableForeground(branding.primaryColor);
    const cardText = hasReadableContrast(primaryForeground, branding.secondaryColor, 4.5)
      ? primaryForeground
      : DARK_FOREGROUND;
    const mutedText = cardText === DARK_FOREGROUND ? "#4B5563" : "rgba(255,255,255,0.80)";
    const progressFill = hasReadableContrast(branding.secondaryColor, branding.backgroundColor, 3)
      ? branding.secondaryColor
      : branding.primaryColor;
    const ctaBackground = branding.buttonColor || branding.primaryColor;
    const ctaForeground = getReadableForeground(ctaBackground);
    const progressTrack = cardText === DARK_FOREGROUND ? "#E5E7EB" : withAlpha(branding.secondaryColor, 0.20);
    const usesReadableSingleForeground = hasReadableContrast(cardText, branding.primaryColor, 4.5) && hasReadableContrast(cardText, branding.secondaryColor, 4.5);
    const cardBackground = usesReadableSingleForeground
      ? `linear-gradient(180deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
      : branding.backgroundColor;

    return {
      ...theme,
      accent: branding.primaryColor,
      secondary: branding.secondaryColor,
      pageBackground: branding.backgroundColor,
      cardBackground,
      cardText,
      mutedText,
      panelBackground: cardText === DARK_FOREGROUND ? "#F8FAFC" : withAlpha(branding.secondaryColor, 0.10),
      border: cardText === DARK_FOREGROUND ? "#E5E7EB" : "rgba(255,255,255,0.14)",
      logoBackground: cardText === DARK_FOREGROUND ? branding.primaryColor : "#FFFFFF",
      logoText: cardText === DARK_FOREGROUND ? getReadableForeground(branding.primaryColor) : "#0F172A",
      badgeBackground: cardText === DARK_FOREGROUND ? "#F8FAFC" : withAlpha(branding.secondaryColor, 0.12),
      badgeText: cardText === DARK_FOREGROUND ? DARK_FOREGROUND : cardText,
      badgeBorder: cardText === DARK_FOREGROUND ? "#E5E7EB" : "rgba(255,255,255,0.18)",
      rewardPanelBackground: cardText === DARK_FOREGROUND ? "#FFFFFF" : "#FFFFFF",
      rewardPanelText: DARK_FOREGROUND,
      rewardPanelMuted: "#6B7280",
      rewardPanelBorder: "rgba(15, 23, 42, 0.08)",
      progressTrack,
      progressFill,
      ctaBackground,
      ctaForeground,
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

export function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return hexColor;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
