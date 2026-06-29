import type { ReactNode } from "react";
import { cn } from "./utils";

export function PageIntro({
  eyebrow,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide business-primary">{eyebrow}</p> : null}
        {description ? <p className="max-w-3xl text-sm leading-6 text-[#64748B]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
