import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export function DashboardPageLayout({
  summary,
  actions,
  children,
  className,
}: {
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5 pb-24 md:pb-0", className)}>
      {summary}
      {actions}
      {children}
    </div>
  );
}
