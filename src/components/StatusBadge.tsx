import type { CustomerMembershipStatus, RecordStatus, SubscriptionStatus } from "@prisma/client";
import { subscriptionStatusLabels } from "@/lib/subscriptions";

export function StatusBadge({ status }: { status: RecordStatus | SubscriptionStatus | CustomerMembershipStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "TRIAL"
        ? "bg-orange-50 text-[#F97316]"
        : status === "SUSPENDED" || status === "EXPIRED" || status === "CANCELLED"
          ? "bg-red-50 text-red-700"
          : "bg-zinc-100 text-zinc-700";
  const label = status in subscriptionStatusLabels ? subscriptionStatusLabels[status as SubscriptionStatus] : status.replaceAll("_", " ").toLowerCase();

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
