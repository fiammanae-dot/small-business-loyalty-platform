import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "./utils";
import { interactiveFocusRing, interactiveMotion } from "./styles";

export function ActionMenu({ label = "More actions", children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <details className={cn("relative inline-block text-left", className)}>
      <summary className={cn("inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#334155] shadow-sm hover:bg-[#F8FAFC]", interactiveMotion, interactiveFocusRing)}>
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        <span>{label}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 min-w-48 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-xl">{children}</div>
    </details>
  );
}

export function ActionMenuItem({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <div className={cn("rounded-md px-2 py-1.5 text-sm transition hover:bg-[#F8FAFC]", danger ? "text-[#B91C1C]" : "text-[#334155]")}>{children}</div>;
}
