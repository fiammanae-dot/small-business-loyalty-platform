import type { ReactNode } from "react";
import { cn } from "./utils";

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn("space-y-4", className)}>{children}</ol>;
}

export function TimelineItem({
  title,
  time,
  description,
  marker,
  className,
}: {
  title: ReactNode;
  time?: ReactNode;
  description?: ReactNode;
  marker?: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("relative pl-8", className)}>
      <span className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#FED7AA] bg-[#FFF7ED] text-[#F97316]" aria-hidden>
        {marker}
      </span>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-sm font-semibold text-[#1E293B]">{title}</h3>
        {time ? <p className="text-xs text-[#64748B]">{time}</p> : null}
      </div>
      {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
    </li>
  );
}
