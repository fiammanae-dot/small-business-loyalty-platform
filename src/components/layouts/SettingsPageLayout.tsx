import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export function SettingsPageLayout({
  selector,
  tabs,
  children,
  className,
}: {
  selector?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 pb-24 md:pb-0", className)}>
      <div className="md:hidden">{selector}</div>
      <div className="hidden md:block">{tabs}</div>
      {children}
    </div>
  );
}
