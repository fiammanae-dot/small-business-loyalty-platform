import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "./utils";
import { disabledState, interactiveFocusRing, interactiveMotion } from "./styles";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "business";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#E86A33] text-white hover:bg-[#C24E1E] border-transparent shadow-[0_2px_8px_rgba(232,106,51,0.25)]",
  secondary: "bg-[#F3F4F7] text-[#3D4352] hover:bg-[#E7E9EE] border-[#E7E9EE]",
  outline: "bg-white text-[#3D4352] hover:bg-[#F3F4F7] border-[#D8DBE2]",
  ghost: "bg-transparent text-[#5A6070] hover:bg-[#F3F4F7] border-transparent",
  danger: "bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] border-[#FECACA]",
  success: "bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5] border-[#A7F3D0]",
  business: "business-button border-transparent",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border font-semibold",
    interactiveMotion,
    interactiveFocusRing,
    disabledState,
    variants[variant],
    sizes[size],
    className,
  );
}

type BaseButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type ButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;
type ButtonLinkProps = BaseButtonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button({ variant, size, className, leftIcon, rightIcon, children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClassName({ variant, size, className })} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

export function ButtonLink({ variant, size, className, leftIcon, rightIcon, children, href, ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClassName({ variant, size, className })} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
