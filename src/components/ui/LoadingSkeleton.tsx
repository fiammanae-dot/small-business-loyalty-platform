import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export function LoadingSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-[#E2E8F0]", className)} aria-hidden {...props} />;
}
