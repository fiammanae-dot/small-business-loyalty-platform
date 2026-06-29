import type { CSSProperties, ReactNode } from "react";
import type { ResolvedBusinessBranding } from "@/lib/business-branding";
import { getReadableForeground } from "@/lib/color-contrast";

type BusinessBrandingProviderProps = {
  branding: ResolvedBusinessBranding | null;
  children: ReactNode;
};

type BusinessBrandingStyle = CSSProperties & {
  "--business-primary"?: string;
  "--business-secondary"?: string;
  "--business-background"?: string;
  "--business-text"?: string;
  "--business-button"?: string;
  "--business-primary-foreground"?: string;
  "--business-button-foreground"?: string;
  "--business-bg-foreground"?: string;
};

export function BusinessBrandingProvider({ branding, children }: BusinessBrandingProviderProps) {
  if (!branding) return <>{children}</>;

  const style: BusinessBrandingStyle = {
    "--business-primary": branding.primaryColor,
    "--business-secondary": branding.secondaryColor,
    "--business-background": branding.backgroundColor,
    "--business-text": branding.textColor,
    "--business-button": branding.buttonColor,
    "--business-primary-foreground": getReadableForeground(branding.primaryColor),
    "--business-button-foreground": getReadableForeground(branding.buttonColor),
    "--business-bg-foreground": getReadableForeground(branding.primaryColor),
  };

  return (
    <div className="business-theme" style={style}>
      {children}
    </div>
  );
}
