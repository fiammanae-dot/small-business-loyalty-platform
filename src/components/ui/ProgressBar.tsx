import { cn } from "./utils";

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  barClassName?: string;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {label ? <div className="mb-2 text-sm font-medium text-[#3D4352]">{label}</div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-[#E7E9EE]" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className={cn("h-full rounded-full bg-[#E86A33] business-progress transition-all duration-300 ease-out motion-reduce:transition-none", barClassName)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
