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
    <div className={cn("rounded-xl border border-dashed border-[#D8DBE2] bg-[#F6F7F9] p-6 text-center md:p-8", className)}>
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white business-primary shadow-sm" aria-hidden>{icon}</div> : null}
      <h2 className="text-base font-bold text-[#171A21]">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7A8091]">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
