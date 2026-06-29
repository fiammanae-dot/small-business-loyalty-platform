export const DARK_FOREGROUND = "#111827";
export const LIGHT_FOREGROUND = "#FFFFFF";

function normalizeHexColor(color: string | null | undefined) {
  if (!color) return null;
  const trimmed = color.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;

  const value = match[1];
  if (value.length === 3) {
    return `#${value.split("").map((char) => char + char).join("")}`.toUpperCase();
  }

  return `#${value.toUpperCase()}`;
}

export function getRgbFromHex(color: string | null | undefined) {
  const normalized = normalizeHexColor(color);
  if (!normalized) return null;

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function getRelativeLuminance(color: string | null | undefined) {
  const rgb = getRgbFromHex(color);
  if (!rgb) return null;

  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return null;

  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableForeground(background: string | null | undefined) {
  const darkContrast = background ? getContrastRatio(DARK_FOREGROUND, background) : null;
  const lightContrast = background ? getContrastRatio(LIGHT_FOREGROUND, background) : null;

  if (darkContrast === null || lightContrast === null) return LIGHT_FOREGROUND;
  return darkContrast >= lightContrast ? DARK_FOREGROUND : LIGHT_FOREGROUND;
}

export function hasReadableContrast(foreground: string, background: string, minimumRatio = 4.5) {
  const ratio = getContrastRatio(foreground, background);
  return ratio === null ? false : ratio >= minimumRatio;
}
