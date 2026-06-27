import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from "react";
import { cn } from "./utils";

export function DataTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-sm [scrollbar-gutter:stable]">
      <table className={cn("min-w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function DataTableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wide text-[#64748B]", className)} {...props} />;
}

export function DataTableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-[#E2E8F0]", className)} {...props} />;
}

export function DataTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("min-w-0 px-3 py-3 align-middle text-[#334155]", className)}>{children}</td>;
}

export function DataTableHeadCell({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-3 align-middle", className)}>{children}</th>;
}
