import type { HTMLAttributes, ReactNode, TableHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./utils";

export function DataTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#E7E9EE] bg-white shadow-sm shadow-[0_1px_2px_rgba(15,18,25,0.04)] [scrollbar-gutter:stable]">
      <table className={cn("min-w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function DataTableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-[#F6F7F9] text-[11px] font-bold uppercase tracking-wide text-[#7A8091]", className)} {...props} />;
}

export function DataTableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-[#E7E9EE] [&>tr]:transition-colors [&>tr:hover]:bg-[#F6F7F9]", className)} {...props} />;
}

export function DataTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("min-w-0 px-3 py-3 align-middle text-[#3D4352]", className)}>{children}</td>;
}

export function DataTableHeadCell({ children, className, ...props }: { children: ReactNode; className?: string } & ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("px-3 py-3 align-middle", className)} {...props}>{children}</th>;
}
