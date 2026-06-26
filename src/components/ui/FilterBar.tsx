import type { FormHTMLAttributes, ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "./utils";

export function FilterBar({
  title = "Filters",
  children,
  actions,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  title?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <form className={cn("rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4", className)} {...props}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
          <SlidersHorizontal className="h-4 w-4 text-[#F97316]" aria-hidden />
          {title}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </form>
  );
}
