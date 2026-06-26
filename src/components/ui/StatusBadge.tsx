import type { ReactNode } from "react";
import { cn } from "./utils";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "business";

const tones: Record<StatusBadgeTone, string> = {
  neutral: "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]",
  success: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  danger: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  info: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
  brand: "border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]",
  business: "business-border-soft business-bg-soft business-text",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
