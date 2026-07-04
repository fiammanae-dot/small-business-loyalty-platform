import type { InvoiceStatus } from "@prisma/client";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge";
import { invoiceStatusLabels } from "@/lib/billing";

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const tone: StatusBadgeTone =
    status === "PAID"
      ? "success"
      : status === "OVERDUE" || status === "CANCELLED"
        ? "danger"
        : status === "ISSUED"
          ? "brand"
          : "neutral";

  return <StatusBadge tone={tone}>{invoiceStatusLabels[status]}</StatusBadge>;
}
