import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export function PageActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)} {...props} />;
}
