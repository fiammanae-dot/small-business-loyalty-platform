import type { ReactNode } from "react";
import { cn } from "./utils";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "business";

const tones: Record<StatusBadgeTone, string> = {
  neutral: "border-[#E7E9EE] bg-[#F3F4F7] text-[#5A6070]",
  success: "border-[#CBEAD6] bg-[#E9F6EE] text-[#1D7A46]",
  warning: "border-[#F3D9A4] bg-[#FCF0DC] text-[#B25E09]",
  danger: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  info: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
  brand: "border-[#F4C7AE] bg-[#FBEFE8] text-[#C24E1E]",
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
