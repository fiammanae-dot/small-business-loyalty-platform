import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "./utils";
import { interactiveFocusRing } from "./styles";

type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  href?: string;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "business";
  className?: string;
};

const tones = {
  neutral: "border-[#E2E8F0] bg-white text-[#1E293B]",
  brand: "border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]",
  success: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  danger: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  info: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
  business: "business-border-soft business-bg-soft business-text",
};

export function MetricCard({ label, value, helper, icon, href, tone = "neutral", className }: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
        {icon ? <span className="shrink-0" aria-hidden>{icon}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-bold text-[#0F172A]">{value}</p>
      {helper ? <p className="mt-1 text-sm leading-5 text-[#64748B]">{helper}</p> : null}
      {href ? <span className="mt-3 inline-flex text-xs font-semibold business-primary">View</span> : null}
    </>
  );

  const classes = cn(
    "block min-w-0 rounded-xl border p-4 shadow-sm transition duration-200 ease-out md:p-5",
    tones[tone],
    href && cn("cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0", interactiveFocusRing),
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
