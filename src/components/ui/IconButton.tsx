import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  variant?: "neutral" | "primary" | "danger" | "business";
};

const variants = {
  neutral: "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]",
  primary: "border-[#FED7AA] bg-[#FFF7ED] text-[#EA580C] hover:bg-[#FFEDD5]",
  danger: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2]",
  business: "business-border business-bg-soft business-text business-hover",
};

export function IconButton({ label, icon, variant = "neutral", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
