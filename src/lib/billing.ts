import type { InvoiceStatus, PaymentMethod } from "@prisma/client";

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

export const invoiceStatuses = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"] as const;
export const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "OTHER"] as const;

export function getInvoiceDisplayStatus(invoice: { status: InvoiceStatus; dueDate: Date }) {
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") return invoice.status;
  return invoice.dueDate < new Date() ? "OVERDUE" : invoice.status;
}

export function formatMoney(amount: { toString(): string } | number | string, currency = "AED") {
  return `${currency} ${Number(amount.toString()).toFixed(2)}`;
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
