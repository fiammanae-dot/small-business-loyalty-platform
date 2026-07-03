import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type SectionCardProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function SectionCard({ title, description, actions, children, className, ...props }: SectionCardProps) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5", className)} {...props}>
      {(title || description || actions) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-bold tracking-tight text-[#171A21]">{title}</h2> : null}
            {description ? <p className="mt-1 text-[13px] leading-5 text-[#7A8091]">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
