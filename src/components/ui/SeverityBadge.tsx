import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const severityTones: Record<Severity, StatusBadgeTone> = {
  INFO: "neutral",
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  const tone = severityTones[severity as Severity] ?? "neutral";
  return (
    <StatusBadge tone={tone} className={className}>
      {severity}
    </StatusBadge>
  );
}
