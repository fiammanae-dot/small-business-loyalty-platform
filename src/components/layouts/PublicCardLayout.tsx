import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export function PublicCardLayout({
  card,
  progress,
  actions,
  secondary,
  className,
}: {
  card: ReactNode;
  progress?: ReactNode;
  actions?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto min-h-screen max-w-xl space-y-4 px-4 py-5", className)}>
      {card}
      {progress}
      {actions}
      {secondary}
    </main>
  );
}
