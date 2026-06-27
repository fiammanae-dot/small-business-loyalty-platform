import type { ReactNode } from "react";
import type { resolveCardThemeColors } from "@/lib/card-themes";

export type WalletTheme = ReturnType<typeof resolveCardThemeColors>;

export function WalletCardShell({
  theme,
  children,
  className = "",
}: {
  theme: WalletTheme;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden p-5 sm:p-6 ${className}`}
      style={{
        background: theme.cardBackground,
        color: theme.cardText,
        borderRadius: theme.radius,
        boxShadow: theme.shadow,
      }}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl" style={{ backgroundColor: theme.decorative }} />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: theme.decorative }} />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ backgroundColor: theme.border }} />
      <div className="relative">{children}</div>
    </section>
  );
}
