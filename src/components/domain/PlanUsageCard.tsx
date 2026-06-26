import { MetricCard, ProgressBar } from "@/components/ui";

export function PlanUsageCard({
  label,
  used,
  limit,
  href,
}: {
  label: string;
  used: number;
  limit: number;
  href?: string;
}) {
  return (
    <MetricCard
      label={label}
      value={`${used} / ${limit}`}
      helper={<ProgressBar value={used} max={limit} />}
      href={href}
      tone={used >= limit ? "warning" : "neutral"}
    />
  );
}
