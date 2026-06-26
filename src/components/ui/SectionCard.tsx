import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type SectionCardProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function SectionCard({ title, description, actions, children, className, ...props }: SectionCardProps) {
  return (
    <section className={cn("rounded-md border border-[#E2E8F0] bg-white p-4 shadow-sm md:p-5", className)} {...props}>
      {(title || description || actions) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold text-[#1E293B]">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
