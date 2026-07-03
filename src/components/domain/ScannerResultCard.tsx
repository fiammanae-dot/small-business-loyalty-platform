import type { ReactNode } from "react";
import { Card, CardContent, ProgressBar, StatusBadge } from "@/components/ui";

export function ScannerResultCard({
  customerName,
  tier,
  programName,
  current,
  required,
  rewardReady,
  actions,
}: {
  customerName: string;
  tier?: string | null;
  programName: string;
  current: number;
  required: number;
  rewardReady: boolean;
  actions?: ReactNode;
}) {
  return (
    <Card className="business-border-soft">
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide business-text">Action summary</p>
            <h2 className="mt-1 truncate text-xl font-bold text-[#0F172A]">{customerName}</h2>
            <p className="mt-1 text-sm text-[#64748B]">{programName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tier ? <StatusBadge tone="brand">{tier}</StatusBadge> : null}
            <StatusBadge tone={rewardReady ? "success" : "info"}>{rewardReady ? "Reward ready" : `${Math.max(0, required - current)} visits remaining`}</StatusBadge>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={current} max={required} label={`${current} / ${required} progress`} />
        </div>
        {actions ? <div className="mt-5 flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
