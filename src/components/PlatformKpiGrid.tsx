import type { ReactNode } from "react";

export function PlatformKpiGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`grid auto-rows-fr grid-cols-2 gap-3 ${className}`}>{children}</section>;
}