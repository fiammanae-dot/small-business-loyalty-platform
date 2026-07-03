import type { CustomerMembershipStatus, RecordStatus, SubscriptionStatus } from "@prisma/client";
import { subscriptionStatusLabels } from "@/lib/subscriptions";

export function StatusBadge({ status }: { status: RecordStatus | SubscriptionStatus | CustomerMembershipStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-[#E9F6EE] text-[#1D7A46]"
      : status === "TRIAL"
        ? "bg-[#FBEFE8] text-[#C24E1E]"
        : status === "SUSPENDED" || status === "EXPIRED" || status === "CANCELLED"
          ? "bg-red-50 text-red-700"
          : "bg-[#F3F4F7] text-[#5A6070]";
  const label = status in subscriptionStatusLabels ? subscriptionStatusLabels[status as SubscriptionStatus] : status.replaceAll("_", " ").toLowerCase();

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
