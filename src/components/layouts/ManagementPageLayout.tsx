import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export function ManagementPageLayout({
  kpis,
  filters,
  toolbar,
  children,
  className,
}: {
  kpis?: ReactNode;
  filters?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {kpis}
      {filters}
      {toolbar}
      {children}
    </div>
  );
}
