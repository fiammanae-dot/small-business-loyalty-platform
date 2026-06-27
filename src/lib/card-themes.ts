import type { CardTheme } from "@prisma/client";

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
  progressTrack: string;
  progressFill: string;
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
    secondary: "#EA580C",
    surface: "#FFF7ED",
    pageBackground: "#FFF7ED",
    cardBackground: "radial-gradient(circle at 12% 8%, rgba(255,255,255,0.36), transparent 34%), linear-gradient(145deg, #F97316, #EA580C)",
    cardText: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.74)",
    panelBackground: "rgba(255,255,255,0.16)",
    border: "rgba(255,255,255,0.26)",
    qrSurface: "#FFFFFF",
    radius: "34px",
    innerRadius: "24px",
    shadow: "0 24px 70px rgba(234, 88, 12, 0.22)",
    progressTrack: "rgba(234,88,12,0.16)",
    progressFill: "linear-gradient(90deg, #EA580C, #F97316)",
    decorative: "rgba(255,255,255,0.2)",
  },
  "premium-dark": {
    style: "premium-dark",
    eyebrow: "Premium Dark",
    label: "Premium Dark",
    description: "Deep premium card styling with high contrast, glow, and luxury weight.",
    accent: "#D97706",
    secondary: "#111827",
    surface: "#111827",
    pageBackground: "#0F172A",
    cardBackground: "radial-gradient(circle at 78% 12%, rgba(217,119,6,0.38), transparent 30%), linear-gradient(145deg, #111827, #020617)",
    cardText: "#F8FAFC",
    mutedText: "rgba(248,250,252,0.7)",
    panelBackground: "rgba(15,23,42,0.74)",
    border: "rgba(217,119,6,0.34)",
    qrSurface: "#F8FAFC",
    radius: "34px",
    innerRadius: "22px",
    shadow: "0 30px 90px rgba(2, 6, 23, 0.42)",
    progressTrack: "rgba(217,119,6,0.18)",
    progressFill: "linear-gradient(90deg, #F59E0B, #FDE68A)",
    decorative: "rgba(217,119,6,0.18)",
  },
  "minimal-light": {
    style: "minimal-light",
    eyebrow: "Minimal Light",
    label: "Minimal Light",
    description: "Quiet editorial card with generous whitespace, crisp borders, and restrained color.",
    accent: "#111827",
    secondary: "#64748B",
    surface: "#F8FAFC",
    pageBackground: "#F8FAFC",
    cardBackground: "linear-gradient(145deg, #FFFFFF, #F8FAFC)",
    cardText: "#111827",
    mutedText: "#64748B",
    panelBackground: "rgba(248,250,252,0.92)",
    border: "rgba(15,23,42,0.1)",
    qrSurface: "#FFFFFF",
    radius: "28px",
    innerRadius: "18px",
    shadow: "0 20px 55px rgba(15, 23, 42, 0.08)",
    progressTrack: "rgba(100,116,139,0.16)",
    progressFill: "linear-gradient(90deg, #111827, #64748B)",
    decorative: "rgba(15,23,42,0.06)",
  },
  "image-background": {
    style: "image-background",
    eyebrow: "Image Background",
    label: "Image Background",
    description: "Immersive visual-card treatment with brand color overlays and a photo-ready feel.",
    accent: "#7C3AED",
    secondary: "#06B6D4",
    surface: "#EEF2FF",
    pageBackground: "#EEF2FF",
    cardBackground: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.34), transparent 24%), radial-gradient(circle at 86% 18%, rgba(6,182,212,0.5), transparent 26%), linear-gradient(145deg, #7C3AED, #111827)",
    cardText: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.76)",
    panelBackground: "rgba(255,255,255,0.17)",
    border: "rgba(255,255,255,0.28)",
    qrSurface: "#FFFFFF",
    radius: "36px",
    innerRadius: "24px",
    shadow: "0 26px 82px rgba(76, 29, 149, 0.3)",
    progressTrack: "rgba(255,255,255,0.22)",
    progressFill: "linear-gradient(90deg, #06B6D4, #A78BFA)",
    decorative: "rgba(255,255,255,0.18)",
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
}: {
  cardTheme?: CardTheme | null;
  branding: BrandingInput;
}) {
  const theme = getCardThemeDefinition(cardTheme);
  if (theme.value === "BUSINESS_DEFAULT") {
    return {
      ...theme,
      accent: branding.primaryColor,
      secondary: branding.secondaryColor,
      pageBackground: branding.backgroundColor,
      progressTrack: withAlpha(branding.secondaryColor, 0.16),
      progressFill: `linear-gradient(90deg, ${branding.secondaryColor}, ${branding.primaryColor})`,
      button: branding.buttonColor,
      text: branding.textColor,
      cardBackground: `radial-gradient(circle at 12% 8%, rgba(255,255,255,0.36), transparent 34%), linear-gradient(145deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
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
