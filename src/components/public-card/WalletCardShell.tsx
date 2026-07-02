import type { ReactNode } from "react";
import type { resolveCardThemeColors } from "@/lib/card-themes";
import { resolveCardDesign, type CardDesignInput } from "@/lib/card-design";

export type WalletTheme = ReturnType<typeof resolveCardThemeColors>;

export function WalletCardShell({
  theme,
  children,
  className = "",
  exportMode = false,
  cardDesign,
}: {
  theme: WalletTheme;
  children: ReactNode;
  className?: string;
  exportMode?: boolean;
  cardDesign?: CardDesignInput;
}) {
  const design = resolveCardDesign(cardDesign);
  const finish = getCardFinish(design.decorationStyle, exportMode);
  return (
    <div
      className={`mx-auto w-full max-w-[360px] p-[7px] ${className}`}
      style={{
        backgroundColor: theme.phoneBackground,
        borderRadius: theme.phoneRadius,
        boxShadow: exportMode ? "none" : theme.phoneShadow,
      }}
    >
      <section
        className="relative overflow-hidden"
        style={{
          background: theme.cardBackground,
          backgroundImage: getCardBackground(theme.cardBackground, design.backgroundStyle, design.backgroundPattern),
          color: theme.cardText,
          borderRadius: finish.radius ?? theme.radius,
          boxShadow: finish.shadow ?? (exportMode ? "none" : theme.shadow),
          border: finish.border ?? (exportMode ? "1px solid rgba(255,255,255,0.18)" : theme.style === "minimal-light" ? "1px solid #E5E7EB" : undefined),
        }}
      >
        <div className="relative">{children}</div>
      </section>
    </div>
  );
}

function getCardBackground(base: string, style: string, pattern: string) {
  const patternOverlay = getPatternOverlay(pattern);
  if (style === "SOLID") return patternOverlay ? `${patternOverlay}, ${base}` : base;
  if (style === "PATTERN" || style === "INDUSTRY_PATTERN") return `${patternOverlay || "radial-gradient(circle at 18px 18px, rgba(255,255,255,0.20) 2px, transparent 2px)"}, ${base}`;
  return `${patternOverlay ? `${patternOverlay}, ` : ""}${base}, linear-gradient(135deg, rgba(255,255,255,0.22), rgba(15,23,42,0.10))`;
}

function getPatternOverlay(pattern: string) {
  if (pattern === "SUBTLE_DOTS") return "radial-gradient(circle at 16px 16px, rgba(255,255,255,0.24) 1.5px, transparent 1.5px)";
  if (pattern === "DIAGONAL_LINES") return "repeating-linear-gradient(135deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 14px)";
  if (pattern === "WAVES") return "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.18), transparent 34%), radial-gradient(ellipse at 80% 68%, rgba(255,255,255,0.14), transparent 30%)";
  if (pattern === "COFFEE_BEANS") return "radial-gradient(ellipse at 20px 20px, rgba(255,255,255,0.20) 0 4px, transparent 5px)";
  if (pattern === "SCISSORS") return "repeating-linear-gradient(45deg, transparent 0 18px, rgba(255,255,255,0.16) 18px 20px)";
  if (pattern === "WATER_BUBBLES") return "radial-gradient(circle at 18px 20px, rgba(255,255,255,0.20) 0 5px, transparent 6px), radial-gradient(circle at 54px 42px, rgba(255,255,255,0.14) 0 7px, transparent 8px)";
  if (pattern === "FOOD_PATTERN") return "radial-gradient(circle at 24px 24px, rgba(255,255,255,0.18) 0 4px, transparent 5px), repeating-linear-gradient(90deg, transparent 0 28px, rgba(255,255,255,0.10) 28px 30px)";
  if (pattern === "BEAUTY_PATTERN") return "radial-gradient(ellipse at 24px 18px, rgba(255,255,255,0.20) 0 8px, transparent 9px)";
  return "";
}

function getCardFinish(decorationStyle: string, exportMode: boolean) {
  if (decorationStyle === "FLAT") return { shadow: "none", border: "1px solid rgba(15,23,42,0.10)" };
  if (decorationStyle === "SOFT") return { shadow: exportMode ? "none" : "0 18px 40px rgba(15,23,42,0.14)" };
  if (decorationStyle === "GLASS") return { shadow: exportMode ? "none" : "0 22px 50px rgba(15,23,42,0.18)", border: "1px solid rgba(255,255,255,0.28)" };
  if (decorationStyle === "PREMIUM") return { shadow: exportMode ? "none" : "0 26px 60px rgba(15,23,42,0.24)", border: "1px solid rgba(255,255,255,0.22)" };
  if (decorationStyle === "LUXURY") return { shadow: exportMode ? "none" : "0 30px 70px rgba(15,23,42,0.30)", border: "1px solid rgba(255,255,255,0.32)" };
  return {};
}
