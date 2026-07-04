import Link from "next/link";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import { MoreHorizontal, X } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { InvoiceBadge } from "@/components/InvoiceBadge";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import {
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  MetricCard,
} from "@/components/ui";
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
      <section className="flex flex-col gap-3">
        <Message error={params.error} success={params.success} />
        <p className="text-sm text-[#7A8091]">Review invoices, record offline payments, and track billing status.</p>
      </section>

      <section aria-label="Invoice summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Invoices" value={invoiceKpis.total} href="/platform/invoices" />
        <MetricCard label="Paid Invoices" value={invoiceKpis.paid} href="/platform/invoices?status=PAID" tone="success" />
        <MetricCard label="Outstanding Invoices" value={invoiceKpis.outstanding} href="/platform/invoices?status=OUTSTANDING" tone={invoiceKpis.outstanding > 0 ? "warning" : "neutral"} />
        <MetricCard label="Overdue Invoices" value={invoiceKpis.overdue} href="/platform/invoices?status=OVERDUE" tone={invoiceKpis.overdue > 0 ? "danger" : "neutral"} />
      </section>

      <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(160px,1fr)_minmax(150px,1fr)_auto_auto] lg:items-end">
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
            <label>
              <span className="sr-only">Filter by invoice status</span>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              >
                <option value="">All statuses</option>
                <option value="OUTSTANDING">Outstanding</option>
                {statusValues.map((status) => (
                  <option key={status} value={status}>
                    {invoiceStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
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
            <label>
              <span className="sr-only">Filter by due date</span>
              <select
                name="due"
                defaultValue={params.due ?? ""}
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              >
                <option value="">All due dates</option>
                <option value="next30">Due in 30 days</option>
                <option value="past">Past due</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href="/platform/invoices"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          </div>
        </form>
      </MobileFilterDrawer>

      <section aria-label="Invoice results" className="grid gap-3">
        <p className="text-sm font-semibold text-[#171A21]">Showing {invoices.length} invoices</p>

        <div className="grid gap-3 lg:hidden">
          {invoices.map((invoice) => (
            <InvoiceMobileCard key={invoice.id} invoice={invoice} />
          ))}
          {invoices.length === 0 ? <InvoiceEmpty /> : null}
        </div>

        <div className="hidden lg:block">
          <DataTable className="min-w-[920px] table-fixed">
            <DataTableHeader>
              <tr>
                <DataTableHeadCell className="w-[18%] pl-4">Invoice</DataTableHeadCell>
                <DataTableHeadCell className="w-[23%]">Business</DataTableHeadCell>
                <DataTableHeadCell className="w-[19%] text-right">Amount</DataTableHeadCell>
                <DataTableHeadCell className="w-[12%]">Status</DataTableHeadCell>
                <DataTableHeadCell className="w-[13%]">Due</DataTableHeadCell>
                <DataTableHeadCell className="pr-4">Actions</DataTableHeadCell>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </DataTableBody>
          </DataTable>
          {invoices.length === 0 ? (
            <div className="mt-3">
              <InvoiceEmpty />
            </div>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function paidSummary(invoice: InvoiceWithListData) {
  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const count = invoice.payments.length;
  return { paid, count };
}

function InvoiceRow({ invoice }: { invoice: InvoiceWithListData }) {
  const { paid, count } = paidSummary(invoice);
  const displayStatus = getInvoiceDisplayStatus(invoice);
  const overdue = displayStatus === "OVERDUE";

  return (
    <tr className="align-middle">
      <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
        <Link
          href={`/platform/invoices/${invoice.uuid}`}
          className="break-words font-semibold text-[#171A21] transition hover:text-[var(--accent-deep)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          {invoice.invoiceNumber}
        </Link>
        <p className="mt-0.5 text-xs text-[#7A8091]">Issued {formatDate(invoice.invoiceDate)}</p>
      </td>
      <DataTableCell>
        <p className="line-clamp-1 break-words font-medium text-[#3D4352]">{invoice.business.name}</p>
        <p className="mt-0.5 truncate text-xs text-[#7A8091]">
          {invoice.subscription.subscriptionPlan.name} · {invoice.subscription.billingCycle.toLowerCase().replaceAll("_", " ")}
        </p>
      </DataTableCell>
      <DataTableCell className="whitespace-nowrap text-right">
        <p className="font-semibold tabular-nums text-[#171A21]">{formatMoney(invoice.amount, invoice.currency)}</p>
        <p className={`mt-0.5 text-xs tabular-nums ${displayStatus === "PAID" ? "text-[#1D7A46]" : "text-[#7A8091]"}`}>
          paid {formatMoney(paid, invoice.currency)}
          {count > 0 ? ` (${count})` : ""}
        </p>
      </DataTableCell>
      <DataTableCell>
        <InvoiceBadge status={displayStatus} />
      </DataTableCell>
      <DataTableCell className={`whitespace-nowrap ${overdue ? "font-semibold text-[#B91C1C]" : ""}`}>
        {formatDate(invoice.dueDate)}
      </DataTableCell>
      <DataTableCell className="whitespace-nowrap pr-4">
        <div className="flex items-center gap-1.5">
          <ButtonLink href={`/platform/invoices/${invoice.uuid}`} variant="primary" size="sm">
            View
          </ButtonLink>
          <InvoiceActions invoice={invoice} />
        </div>
      </DataTableCell>
    </tr>
  );
}

function InvoiceMobileCard({ invoice }: { invoice: InvoiceWithListData }) {
  const { paid, count } = paidSummary(invoice);
  const displayStatus = getInvoiceDisplayStatus(invoice);
  const overdue = displayStatus === "OVERDUE";

  return (
    <article className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/platform/invoices/${invoice.uuid}`}
            className="break-words font-semibold text-[#171A21] transition hover:text-[var(--accent-deep)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            {invoice.invoiceNumber}
          </Link>
          <p className="mt-1 truncate text-sm text-[#7A8091]">
            {invoice.business.name} · {invoice.subscription.subscriptionPlan.name}
          </p>
        </div>
        <InvoiceBadge status={displayStatus} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Amount</dt>
          <dd className="text-right font-semibold tabular-nums text-[#171A21]">{formatMoney(invoice.amount, invoice.currency)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Paid</dt>
          <dd className={`text-right font-semibold tabular-nums ${displayStatus === "PAID" ? "text-[#1D7A46]" : "text-[#171A21]"}`}>
            {formatMoney(paid, invoice.currency)}
            {count > 0 ? ` (${count})` : ""}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Due</dt>
          <dd className={`text-right font-semibold ${overdue ? "text-[#B91C1C]" : "text-[#171A21]"}`}>{formatDate(invoice.dueDate)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Issued</dt>
          <dd className="text-right font-semibold text-[#171A21]">{formatDate(invoice.invoiceDate)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2">
        <ButtonLink href={`/platform/invoices/${invoice.uuid}`} variant="primary" size="sm" className="flex-1">
          View
        </ButtonLink>
        <InvoiceActions invoice={invoice} expand />
      </div>
    </article>
  );
}

type InvoiceListItem = {
  uuid: string;
  status: InvoiceStatus;
};

function InvoiceActions({ invoice, expand = false }: { invoice: InvoiceListItem; expand?: boolean }) {
  const hasActions = invoice.status !== "CANCELLED";
  if (!hasActions) return null;
  return (
    <details className={`relative ${expand ? "flex-1" : ""}`}>
      <summary
        aria-label="More invoice actions"
        className={`inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white text-sm font-semibold text-[#3D4352] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
          expand ? "w-full px-3" : "w-9"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        {expand ? "More" : null}
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid min-w-40 gap-1 rounded-lg border border-[var(--medium-gray)] bg-white p-1.5 shadow-xl">
        {invoice.status === "DRAFT" ? <StatusForm uuid={invoice.uuid} status="ISSUED" label="Issue" /> : null}
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? <StatusForm uuid={invoice.uuid} status="PAID" label="Mark paid" /> : null}
        {invoice.status !== "CANCELLED" ? <StatusForm uuid={invoice.uuid} status="CANCELLED" label="Cancel" danger /> : null}
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

function StatusForm({ uuid, status, label, danger = false }: { uuid: string; status: InvoiceStatus; label: string; danger?: boolean }) {
  return (
    <form action={updateInvoiceStatusAction}>
      <CsrfInput scope="platform:invoices" />
      <input type="hidden" name="invoiceUuid" value={uuid} />
      <input type="hidden" name="nextStatus" value={status} />
      <ConfirmSubmitButton
        message={invoiceStatusConfirmationMessage(status)}
        className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm font-semibold transition hover:bg-[var(--light-gray)] ${
          danger ? "text-[#B91C1C]" : "text-[#3D4352]"
        }`}
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
  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
        error ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" : "border-[#CBEAD6] bg-[#E9F6EE] text-[#1D7A46]"
      }`}
    >
      {error ?? success}
    </p>
  );
}
