import { StatusBadge, type StatusBadgeTone } from "@/components/ui";

const businessTones: Record<string, StatusBadgeTone> = {
  ACTIVE: "success",
  INACTIVE: "danger",
  SUSPENDED: "warning",
  ARCHIVED: "neutral",
};

export function BusinessStatusBadge({ status }: { status: string }) {
  return <StatusBadge tone={businessTones[status] ?? "neutral"}>{status}</StatusBadge>;
}
