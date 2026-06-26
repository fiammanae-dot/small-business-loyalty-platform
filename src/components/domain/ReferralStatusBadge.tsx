import { StatusBadge, type StatusBadgeTone } from "@/components/ui";

const referralTones: Record<string, StatusBadgeTone> = {
  ACTIVE: "success",
  PENDING: "warning",
  QUALIFIED: "info",
  REWARDED: "success",
  COMPLETED: "success",
  CONSUMED: "neutral",
  DISABLED: "danger",
};

export function ReferralStatusBadge({ status }: { status: string }) {
  return <StatusBadge tone={referralTones[status] ?? "neutral"}>{status.replaceAll("_", " ")}</StatusBadge>;
}
