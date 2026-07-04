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
  neutral: "border-[#E7E9EE] bg-white text-[#171A21]",
  brand: "border-[#F4C7AE] bg-[#FBEFE8] text-[#C24E1E]",
  success: "border-[#CBEAD6] bg-[#E9F6EE] text-[#1D7A46]",
  warning: "border-[#F3D9A4] bg-[#FFFBF2] text-[#B25E09]",
  danger: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  info: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
  business: "business-border-soft business-bg-soft business-text",
};

export function MetricCard({ label, value, helper, icon, href, tone = "neutral", className }: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FBEFE8] business-bg-soft business-primary-strong [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
            {icon}
          </span>
        ) : null}
        <p className="line-clamp-2 min-w-0 text-xs font-semibold leading-tight text-[#7A8091]">{label}</p>
      </div>
      <p className="mt-2.5 text-[26px] font-bold leading-none tracking-tight tabular-nums text-[#171A21]">{value}</p>
      {helper ? <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-4 text-[#7A8091]">{helper}</p> : null}
      {href ? <span className="mt-2.5 inline-flex text-xs font-semibold business-primary-strong">View →</span> : null}
    </>
  );

  const classes = cn(
    "block min-w-0 rounded-xl border p-4 shadow-sm shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition duration-200 ease-out",
    tones[tone],
    href && cn("cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0", interactiveFocusRing),
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
