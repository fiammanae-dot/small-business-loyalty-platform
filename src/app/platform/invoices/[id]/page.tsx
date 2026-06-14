import Link from "next/link";
import { notFound } from "next/navigation";
import type { InvoiceStatus } from "@prisma/client";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { InvoiceBadge } from "@/components/InvoiceBadge";
import { formatMoney, getInvoiceDisplayStatus, paymentMethodLabels, paymentMethods } from "@/lib/billing";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { recordPaymentAction, updateInvoiceStatusAction } from "@/app/platform/invoices/actions";

export default async function PlatformInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const { id } = await params;
  const qs = await searchParams;
  const invoice = await prisma.invoice.findUnique({
    where: { uuid: id },
    include: {
      business: { select: { name: true, uuid: true } },
      subscription: { include: { subscriptionPlan: true } },
      payments: { orderBy: { paidAt: "desc" }, include: { recordedByUser: { select: { name: true, email: true } } } },
      auditLogs: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!invoice) notFound();

  const paidAmount = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = Math.max(0, Number(invoice.amount) - paidAmount);
  const displayStatus = getInvoiceDisplayStatus(invoice);

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title={invoice.invoiceNumber}>
      <div className="flex flex-wrap gap-3">
        <Link href="/platform/invoices" className="inline-flex h-10 items-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
          Back to invoices
        </Link>
        {invoice.status === "DRAFT" ? <StatusForm uuid={invoice.uuid} status="ISSUED" label="Mark Issued" /> : null}
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? <StatusForm uuid={invoice.uuid} status="PAID" label="Mark Paid" /> : null}
        {invoice.status !== "CANCELLED" ? <StatusForm uuid={invoice.uuid} status="CANCELLED" label="Cancel Invoice" /> : null}
      </div>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {qs.error || qs.success ? <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${qs.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{qs.error ?? qs.success}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Info label="Business" value={invoice.business.name} />
          <Info label="Plan" value={invoice.subscription.subscriptionPlan.name} />
          <Info label="Status" value={<InvoiceBadge status={displayStatus} />} />
          <Info label="Invoice date" value={formatDate(invoice.invoiceDate)} />
          <Info label="Due date" value={formatDate(invoice.dueDate)} />
          <Info label="Amount" value={formatMoney(invoice.amount, invoice.currency)} />
          <Info label="Paid amount" value={formatMoney(paidAmount, invoice.currency)} />
          <Info label="Remaining" value={formatMoney(remaining, invoice.currency)} />
        </div>
        {invoice.notes ? <p className="mt-5 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-sm text-[#6B7280]">{invoice.notes}</p> : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-[#E5E7EB] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#111827]">Record payment</h2>
          {invoice.status === "CANCELLED" ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Cancelled invoices cannot receive payments.</p>
          ) : (
            <form action={recordPaymentAction} className="mt-5 grid gap-4">
              <CsrfInput scope="platform:invoices" />
              <input type="hidden" name="invoiceUuid" value={invoice.uuid} />
              <Input name="amount" label="Amount paid" type="number" step="0.01" min="0.01" defaultValue={remaining ? remaining.toFixed(2) : Number(invoice.amount).toFixed(2)} />
              <Input name="currency" label="Currency" defaultValue={invoice.currency} />
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#111827]">Payment method</span>
                <select name="paymentMethod" required className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
                  {paymentMethods.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}
                </select>
              </label>
              <Input name="paymentReference" label="Payment reference" required={false} />
              <Input name="paidAt" label="Paid at" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} />
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#111827]">Notes</span>
                <textarea name="notes" rows={3} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="h-11 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">Record Payment</button>
            </form>
          )}
        </div>

        <div className="rounded-md border border-[#E5E7EB] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#111827]">Payment history</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#6B7280]">
                  {["Amount", "Method", "Reference", "Paid at", "Recorded by"].map((heading) => (
                    <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(payment.amount, payment.currency)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{paymentMethodLabels[payment.paymentMethod]}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{payment.paymentReference ?? "-"}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDateTime(payment.paidAt)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{payment.recordedByUser.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoice.payments.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No payments recorded yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Audit log</h2>
        <div className="mt-5 grid gap-3">
          {invoice.auditLogs.map((log) => (
            <div key={log.id} className="rounded-md border border-[#E5E7EB] p-4">
              <p className="text-sm font-semibold text-[#111827]">{log.action.replaceAll("_", " ").toLowerCase()}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{formatDateTime(log.createdAt)} by {log.user?.name ?? "System"}</p>
              {log.notes ? <p className="mt-2 text-sm text-[#6B7280]">{log.notes}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}

function StatusForm({ uuid, status, label }: { uuid: string; status: InvoiceStatus; label: string }) {
  return (
    <form action={updateInvoiceStatusAction}>
      <CsrfInput scope="platform:invoices" />
      <input type="hidden" name="invoiceUuid" value={uuid} />
      <input type="hidden" name="nextStatus" value={status} />
      <button type="submit" className="inline-flex h-10 items-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
        {label}
      </button>
    </form>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}

function Input({
  name,
  label,
  type = "text",
  defaultValue,
  step,
  min,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  step?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} step={step} min={min} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm" />
    </label>
  );
}
