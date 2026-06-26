import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "./utils";

export function ActionMenu({ label = "More actions", children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <details className={cn("relative inline-block text-left", className)}>
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#334155] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2">
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        <span>{label}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 min-w-48 rounded-md border border-[#E2E8F0] bg-white p-1 shadow-lg">{children}</div>
    </details>
  );
}

export function ActionMenuItem({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <div className={cn("rounded-md px-2 py-1 text-sm", danger ? "text-[#B91C1C]" : "text-[#334155]")}>{children}</div>;
}
