import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export function ScannerPageLayout({
  scanner,
  lookup,
  result,
  className,
}: {
  scanner?: ReactNode;
  lookup?: ReactNode;
  result?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-3xl space-y-4 pb-24 md:pb-0", className)}>
      {scanner}
      {lookup}
      {result}
    </div>
  );
}
