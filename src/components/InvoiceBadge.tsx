import type { InvoiceStatus } from "@prisma/client";
import { invoiceStatusLabels } from "@/lib/billing";

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const tone =
    status === "PAID"
      ? "bg-emerald-50 text-emerald-700"
      : status === "OVERDUE" || status === "CANCELLED"
        ? "bg-red-50 text-red-700"
        : status === "ISSUED"
          ? "bg-orange-50 text-[#F97316]"
          : "bg-zinc-100 text-zinc-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>{invoiceStatusLabels[status]}</span>;
}
