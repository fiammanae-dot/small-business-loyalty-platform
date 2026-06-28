import type { ReactNode } from "react";
import type { resolveCardThemeColors } from "@/lib/card-themes";

export type WalletTheme = ReturnType<typeof resolveCardThemeColors>;

export function WalletCardShell({
  theme,
  children,
  className = "",
  exportMode = false,
}: {
  theme: WalletTheme;
  children: ReactNode;
  className?: string;
  exportMode?: boolean;
}) {
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
          color: theme.cardText,
          borderRadius: theme.radius,
          boxShadow: exportMode ? "none" : theme.shadow,
          border: exportMode ? "1px solid rgba(255,255,255,0.18)" : theme.style === "minimal-light" ? "1px solid #E5E7EB" : undefined,
        }}
      >
        <div className="relative">{children}</div>
      </section>
    </div>
  );
}
