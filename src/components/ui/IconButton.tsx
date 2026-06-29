import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";
import { disabledState, interactiveFocusRing, interactiveMotion } from "./styles";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  variant?: "neutral" | "primary" | "danger" | "business";
};

const variants = {
  neutral: "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]",
  primary: "business-border-soft business-bg-soft business-primary business-hover",
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
        "inline-flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm",
        interactiveMotion,
        interactiveFocusRing,
        disabledState,
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
