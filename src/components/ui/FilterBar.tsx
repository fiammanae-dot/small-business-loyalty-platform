import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "./utils";

type FilterBarSharedProps = {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

type FilterBarFormProps = FilterBarSharedProps & FormHTMLAttributes<HTMLFormElement> & {
  asForm?: true;
};

type FilterBarDivProps = FilterBarSharedProps & HTMLAttributes<HTMLDivElement> & {
  asForm: false;
};

function FilterBarContent({ title, actions, children }: Pick<FilterBarSharedProps, "title" | "actions" | "children">) {
  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
          <SlidersHorizontal className="h-4 w-4 business-primary" aria-hidden />
          {title}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div> : null}
      </div>
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </>
  );
}

export function FilterBar({
  asForm = true,
  title = "Filters",
  children,
  actions,
  className,
  ...props
}: FilterBarFormProps | FilterBarDivProps) {
  const containerClassName = cn("min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-sm", className);

  if (!asForm) {
    return (
      <div className={containerClassName} {...(props as HTMLAttributes<HTMLDivElement>)}>
        <FilterBarContent title={title} actions={actions}>
          {children}
        </FilterBarContent>
      </div>
    );
  }

  return (
    <form className={containerClassName} {...(props as FormHTMLAttributes<HTMLFormElement>)}>
      <FilterBarContent title={title} actions={actions}>
        {children}
      </FilterBarContent>
    </form>
  );
}
