import { Card, CardContent, ProgressBar, StatusBadge } from "@/components/ui";

export function ProgramProgressCard({
  programName,
  current,
  required,
  rewardName,
  rewardReady = false,
}: {
  programName: string;
  current: number;
  required: number;
  rewardName?: string | null;
  rewardReady?: boolean;
}) {
  const remaining = Math.max(0, required - current);

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[#0F172A]">{programName}</h3>
            {rewardName ? <p className="mt-1 text-sm text-[#64748B]">Reward: {rewardName}</p> : null}
          </div>
          {rewardReady ? <StatusBadge tone="success">Reward ready</StatusBadge> : null}
        </div>
        <div className="mt-4">
          <ProgressBar value={current} max={required} label={`${current} / ${required} visits`} />
        </div>
        <p className="mt-3 text-sm font-medium text-[#334155]">
          {rewardReady ? "Ready to redeem" : `${remaining} ${remaining === 1 ? "visit" : "visits"} remaining`}
        </p>
      </CardContent>
    </Card>
  );
}
