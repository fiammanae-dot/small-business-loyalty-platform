import type { ReactNode } from "react";
import { cn } from "./utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center", className)}>
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#F97316]" aria-hidden>{icon}</div> : null}
      <h2 className="text-base font-semibold text-[#1E293B]">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
