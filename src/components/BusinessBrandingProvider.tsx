import type { CSSProperties, ReactNode } from "react";
import type { ResolvedBusinessBranding } from "@/lib/business-branding";

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
};

export function BusinessBrandingProvider({ branding, children }: BusinessBrandingProviderProps) {
  if (!branding) return <>{children}</>;

  const style: BusinessBrandingStyle = {
    "--business-primary": branding.primaryColor,
    "--business-secondary": branding.secondaryColor,
    "--business-background": branding.backgroundColor,
    "--business-text": branding.textColor,
    "--business-button": branding.buttonColor,
  };

  return (
    <div className="business-theme" style={style}>
      {children}
    </div>
  );
}
