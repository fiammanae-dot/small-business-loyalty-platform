import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export function DetailPageLayout({
  header,
  aside,
  children,
  className,
}: {
  header?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {header}
      <div className={cn("grid gap-5", Boolean(aside) && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <main className="min-w-0 space-y-5">{children}</main>
        {aside ? <aside className="min-w-0 space-y-5">{aside}</aside> : null}
      </div>
    </div>
  );
}
