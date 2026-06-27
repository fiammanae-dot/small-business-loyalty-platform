import Link from "next/link";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { InvoiceBadge } from "@/components/InvoiceBadge";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { ButtonLink, EmptyState, MetricCard } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatMoney, getInvoiceDisplayStatus, invoiceStatusLabels } from "@/lib/billing";
import { updateInvoiceStatusAction } from "@/app/platform/invoices/actions";

const statusValues = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"] as const;
type InvoiceWithListData = Prisma.InvoiceGetPayload<{
  include: {
    business: { select: { name: true } };
    subscription: { include: { subscriptionPlan: true } };
    payments: { select: { amount: true } };
  };
}>;

export default async function PlatformInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; status?: string; due?: string; plan?: string; error?: string; success?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const businessId = params.business ? Number(params.business) : undefined;
  const planId = params.plan ? Number(params.plan) : undefined;
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(now.getDate() + 30);

  const [businesses, plans, invoices] = await Promise.all([
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.subscriptionPlan.findMany({ orderBy: { maxBranches: "asc" }, select: { id: true, name: true } }),
    prisma.invoice.findMany({
      where: {
        ...(businessId ? { businessId } : {}),
        ...(planId ? { subscription: { subscriptionPlanId: planId } } : {}),
        ...(params.status && params.status !== "OVERDUE" && params.status !== "OUTSTANDING" && statusValues.includes(params.status as InvoiceStatus)
          ? { status: params.status as InvoiceStatus }
          : {}),
        ...(params.status === "OVERDUE" ? { dueDate: { lt: now }, status: { notIn: ["PAID", "CANCELLED"] } } : {}),
        ...(params.status === "OUTSTANDING" ? { status: { notIn: ["PAID", "CANCELLED"] } } : {}),
        ...(params.due === "next30" ? { dueDate: { gte: now, lte: in30Days } } : {}),
        ...(params.due === "past" ? { dueDate: { lt: now } } : {}),
      },
      include: {
        business: { select: { name: true } },
        subscription: { include: { subscriptionPlan: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const activeFilterCount = [params.business, params.status, params.due, params.plan].filter(Boolean).length;
  const invoiceKpis = {
    total: invoices.length,
    paid: invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "PAID").length,
    overdue: invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "OVERDUE").length,
    outstanding: invoices.filter((invoice) => !["PAID", "CANCELLED"].includes(getInvoiceDisplayStatus(invoice))).length,
  };

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Invoices">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <Message error={params.error} success={params.success} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Invoice workflow</h2>
            <p className="text-sm text-[#6B7280]">Review invoices, record offline payments, and track billing status.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MetricCard label="Total Invoices" value={invoiceKpis.total} href="/platform/invoices" />
          <MetricCard label="Paid Invoices" value={invoiceKpis.paid} href="/platform/invoices?status=PAID" tone="success" />
          <MetricCard label="Outstanding Invoices" value={invoiceKpis.outstanding} href="/platform/invoices?status=OUTSTANDING" tone={invoiceKpis.outstanding > 0 ? "warning" : "neutral"} />
          <MetricCard label="Overdue Invoices" value={invoiceKpis.overdue} href="/platform/invoices?status=OVERDUE" tone={invoiceKpis.overdue > 0 ? "danger" : "neutral"} />
        </div>
        <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="mt-5 grid gap-3 rounded-md border border-[#E5E7EB] bg-zinc-50 p-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-center">
          <SearchableCombobox
            label="Business"
            name="business"
            defaultValue={params.business ?? ""}
            placeholder="All businesses"
            emptyLabel="No businesses found."
            options={[
              { value: "", label: "All businesses", description: "Show invoices for every business" },
              ...businesses.map((business) => ({ value: business.id.toString(), label: business.name, description: "Business" })),
            ]}
          />
          <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
            <option value="">All statuses</option>
            <option value="OUTSTANDING">Outstanding</option>
            {statusValues.map((status) => <option key={status} value={status}>{invoiceStatusLabels[status]}</option>)}
          </select>
          <SearchableCombobox
            label="Plan"
            name="plan"
            defaultValue={params.plan ?? ""}
            placeholder="All plans"
            emptyLabel="No plans found."
            options={[
              { value: "", label: "All plans", description: "Show invoices for every plan" },
              ...plans.map((plan) => ({ value: plan.id.toString(), label: plan.name, description: "Subscription plan" })),
            ]}
          />
          <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
            Apply
          </button>
          <Link href="/platform/invoices" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827]">
            Clear Filters
          </Link>
          <details className="lg:col-span-full">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
              Advanced Filters
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
          <select name="due" defaultValue={params.due ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
            <option value="">All due dates</option>
            <option value="next30">Due in 30 days</option>
            <option value="past">Past due</option>
          </select>
            </div>
          </details>
        </form>
        </MobileFilterDrawer>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-[#6B7280]">Showing {invoices.length} invoices</p>
        <div className="grid gap-3 lg:hidden">
          {invoices.map((invoice) => {
            const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            const displayStatus = getInvoiceDisplayStatus(invoice);
            return (
              <article key={invoice.id} className="rounded-md border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/platform/invoices/${invoice.uuid}`} className="font-semibold text-[#111827] hover:text-[#F97316]">{invoice.invoiceNumber}</Link>
                    <p className="mt-1 text-sm text-[#6B7280]">{invoice.business.name}</p>
                  </div>
                  <InvoiceBadge status={displayStatus} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
                  <p>Plan: {invoice.subscription.subscriptionPlan.name}</p>
                  <p>Due: {formatDate(invoice.dueDate)}</p>
                  <p>Amount: {formatMoney(invoice.amount, invoice.currency)}</p>
                  <p>Paid: {formatMoney(paid, invoice.currency)}</p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/platform/invoices/${invoice.uuid}`} className="rounded-md bg-[#F97316] px-3 py-2 text-xs font-semibold text-white">View</Link>
                  <InvoiceActions invoice={invoice} />
                </div>
              </article>
            );
          })}
          {invoices.length === 0 ? <InvoiceEmpty /> : null}
        </div>
        <div className="hidden lg:block">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Invoice Number", "Business", "Amount", "Status", "Due Date", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
                const displayStatus = getInvoiceDisplayStatus(invoice);
                return (
                  <InvoiceDesktopRows key={invoice.id} invoice={invoice} paid={paid} displayStatus={displayStatus} />
                );
              })}
            </tbody>
          </table>
          {invoices.length === 0 ? <InvoiceEmpty /> : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function InvoiceDesktopRows({ invoice, paid, displayStatus }: { invoice: InvoiceWithListData; paid: number; displayStatus: InvoiceStatus | "OVERDUE" }) {
  return (
    <>
      <tr className="align-top">
        <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">
          <Link href={`/platform/invoices/${invoice.uuid}`} className="break-words hover:text-[#F97316]">{invoice.invoiceNumber}</Link>
        </td>
        <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">
          <span className="line-clamp-2 break-words">{invoice.business.name}</span>
        </td>
        <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{formatMoney(invoice.amount, invoice.currency)}</td>
        <td className="border-b border-[#E5E7EB] px-3 py-4"><InvoiceBadge status={displayStatus} /></td>
        <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(invoice.dueDate)}</td>
        <td className="border-b border-[#E5E7EB] px-3 py-4">
          <div className="flex items-center gap-2">
            <Link href={`/platform/invoices/${invoice.uuid}`} className="rounded-md bg-[#F97316] px-3 py-2 text-xs font-semibold text-white">View</Link>
            <InvoiceActions invoice={invoice} />
          </div>
        </td>
      </tr>
      <tr>
        <td colSpan={6} className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
          <details className="group">
            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]">
              Invoice details
            </summary>
            <dl className="mt-3 grid gap-3 rounded-md border border-[#E5E7EB] bg-white p-3 text-sm md:grid-cols-2 xl:grid-cols-3">
              <InvoiceDetail label="Plan" value={invoice.subscription.subscriptionPlan.name} />
              <InvoiceDetail label="Issue Date" value={formatDate(invoice.invoiceDate)} />
              <InvoiceDetail label="Payment Date" value={displayStatus === "PAID" ? "Payment recorded" : "Not paid"} />
              <InvoiceDetail label="Billing Cycle" value={formatInvoiceBillingCycle(invoice.subscription.billingCycle)} />
              <InvoiceDetail label="Created By" value="System" />
              <InvoiceDetail label="Invoice Notes" value="No notes recorded" />
              <InvoiceDetail label="Payment History" value={`${invoice.payments.length} payment(s) - ${formatMoney(paid, invoice.currency)} paid`} />
              <InvoiceDetail label="Audit History" value={`Current status: ${displayStatus.toLowerCase()}`} />
              <InvoiceDetail label="Additional Metadata" value={`Invoice UUID: ${invoice.uuid}`} />
            </dl>
          </details>
        </td>
      </tr>
    </>
  );
}

function InvoiceDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[#111827]">{value}</dd>
    </div>
  );
}

function formatInvoiceBillingCycle(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}
type InvoiceListItem = {
  uuid: string;
  status: InvoiceStatus;
};

function InvoiceActions({ invoice }: { invoice: InvoiceListItem }) {
  const hasActions = invoice.status !== "CANCELLED";
  if (!hasActions) return null;
  return (
    <details className="relative">
      <summary className="list-none rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827] marker:hidden">
        More
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid min-w-36 gap-1 rounded-md border border-[#E5E7EB] bg-white p-2 shadow-lg">
        {invoice.status === "DRAFT" ? <StatusForm uuid={invoice.uuid} status="ISSUED" label="Issue" /> : null}
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? <StatusForm uuid={invoice.uuid} status="PAID" label="Mark paid" /> : null}
        {invoice.status !== "CANCELLED" ? <StatusForm uuid={invoice.uuid} status="CANCELLED" label="Cancel" /> : null}
      </div>
    </details>
  );
}

function InvoiceEmpty() {
  return (
    <EmptyState
      title="No invoices match these filters."
      description="Clear filters or review subscription billing records."
      action={<ButtonLink href="/platform/invoices" variant="primary">Clear Filters</ButtonLink>}
    />
  );
}

function StatusForm({ uuid, status, label }: { uuid: string; status: InvoiceStatus; label: string }) {
  return (
    <form action={updateInvoiceStatusAction}>
      <CsrfInput scope="platform:invoices" />
      <input type="hidden" name="invoiceUuid" value={uuid} />
      <input type="hidden" name="nextStatus" value={status} />
      <ConfirmSubmitButton
        message={invoiceStatusConfirmationMessage(status)}
        className="w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-[#F97316] hover:bg-orange-50"
      >
        {label}
      </ConfirmSubmitButton>
    </form>
  );
}

function invoiceStatusConfirmationMessage(status: InvoiceStatus) {
  if (status === "PAID") return "Mark this invoice as paid? Confirm payment was received.";
  if (status === "CANCELLED") return "Cancel this invoice? This cannot be used for payment tracking afterward.";
  return "Update this invoice status?";
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}






