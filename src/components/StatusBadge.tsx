import type { CustomerMembershipStatus, RecordStatus, SubscriptionStatus } from "@prisma/client";
import { StatusBadge as UiStatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge";
import { subscriptionStatusLabels } from "@/lib/subscriptions";

export function StatusBadge({ status }: { status: RecordStatus | SubscriptionStatus | CustomerMembershipStatus }) {
  const tone: StatusBadgeTone =
    status === "ACTIVE"
      ? "success"
      : status === "TRIAL"
        ? "brand"
        : status === "SUSPENDED" || status === "EXPIRED" || status === "CANCELLED"
          ? "danger"
          : "neutral";
  const label = status in subscriptionStatusLabels ? subscriptionStatusLabels[status as SubscriptionStatus] : status.replaceAll("_", " ").toLowerCase();

  return (
    <UiStatusBadge tone={tone} className="capitalize">
      {label}
    </UiStatusBadge>
  );
}
