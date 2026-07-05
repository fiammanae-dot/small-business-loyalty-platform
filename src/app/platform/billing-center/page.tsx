import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import { Download, FileSpreadsheet, FileText, SlidersHorizontal } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileAccordionSection } from "@/components/MobileAccordionSection";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
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
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { formatMoney, getInvoiceDisplayStatus } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatBillingCycle } from "@/lib/subscription-plans";
import { getSubscriptionRemainingDays, getTrialRemainingDays } from "@/lib/subscriptions";

type BillingParams = {
  tab?: string;
  business?: string;
  plan?: string;
  status?: string;
  date?: string;
  from?: string;
  to?: string;
  revenueMin?: string;
  revenueMax?: string;
  trial?: string;
  renewal?: string;
};

type SubscriptionRow = Prisma.BusinessSubscriptionGetPayload<{
  include: {
    business: { select: { uuid: true; name: true; status: true } };
    subscriptionPlan: true;
    auditLogs: { include: { user: { select: { name: true; email: true } } } };
    invoices: { include: { payments: true } };
  };
}>;

type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: {
    business: { select: { uuid: true; name: true } };
    subscription: { include: { subscriptionPlan: true } };
    payments: true;
  };
}>;

type ChartPoint = { label: string; value: number };

const statusOptions = ["TRIAL", "ACTIVE", "PENDING_RENEWAL", "EXPIRED", "SUSPENDED", "CANCELLED", "ARCHIVED"];

export default async function PlatformBillingCenterPage({
  searchParams,
}: {
  searchParams: Promise<BillingParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dateRange = getDateRange(params, now);

  const [plans, subscriptions, invoices, payments, businesses] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { maxBranches: "asc" } }),
    prisma.businessSubscription.findMany({
      include: {
        business: { select: { uuid: true, name: true, status: true } },
        subscriptionPlan: true,
        auditLogs: { orderBy: { createdAt: "desc" }, take: 1, include: { user: { select: { name: true, email: true } } } },
        invoices: { include: { payments: true } },
      },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
    }),
    prisma.invoice.findMany({
      include: {
        business: { select: { uuid: true, name: true } },
        subscription: { include: { subscriptionPlan: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      include: { invoice: { include: { subscription: { include: { subscriptionPlan: true } }, business: true } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const filteredSubscriptions = subscriptions.filter((subscription) => matchesSubscriptionFilters(subscription, params, dateRange, now));
  const filteredInvoices = invoices.filter((invoice) => matchesInvoiceFilters(invoice, params, dateRange));
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "ACTIVE");
  const trialSubscriptions = subscriptions.filter((subscription) => subscription.status === "TRIAL");
  const expiringWithin30 = subscriptions.filter((subscription) => {
    const days = getSubscriptionRemainingDays(subscription);
    return days !== null && days >= 0 && days <= 30;
  });
  const overdueInvoices = invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "OVERDUE");
  const suspendedAccounts = subscriptions.filter((subscription) => subscription.status === "SUSPENDED");
  const cancelledSubscriptions = subscriptions.filter((subscription) => subscription.status === "CANCELLED");
  const monthlyRevenue = sumPayments(payments.filter((payment) => payment.paidAt >= monthStart));
  const todayRevenue = sumPayments(payments.filter((payment) => isSameUtcDay(payment.paidAt, now)));
  const lastMonthRevenue = sumPayments(payments.filter((payment) => payment.paidAt >= lastMonthStart && payment.paidAt < monthStart));
  const ytdRevenue = sumPayments(payments.filter((payment) => payment.paidAt >= yearStart));
  const averageRevenuePerBusiness = businesses.length > 0 ? ytdRevenue / businesses.length : 0;
  const revenueByPlan = calculateRevenueByPlan(payments, plans);
  const highestRevenuePlan = revenueByPlan[0]?.name ?? "No revenue yet";
  const lowestRevenuePlan = [...revenueByPlan].reverse()[0]?.name ?? "No revenue yet";
  const outstandingRevenue = invoices
    .filter((invoice) => !["PAID", "CANCELLED"].includes(invoice.status))
    .reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount) - invoice.payments.reduce((paid, payment) => paid + Number(payment.amount), 0)), 0);
  const overdueRevenue = overdueInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount) - invoice.payments.reduce((paid, payment) => paid + Number(payment.amount), 0)), 0);
  const billingHealth = getBillingHealth({ overdueInvoices: overdueInvoices.length, suspendedAccounts: suspendedAccounts.length, expiringWithin30: expiringWithin30.length });
  const recentMonths = getRecentMonths(now, 6);
  const activeTab = getBillingTab(params.tab);
  const activeFilterCount = Object.entries(params).filter(([key, value]) => !["export", "tab"].includes(key) && Boolean(value)).length;
  const hasAdvancedFilters = Boolean(params.date || params.from || params.to || params.revenueMin || params.revenueMax || params.trial || params.renewal);
  const needsAttention = overdueInvoices.length + suspendedAccounts.length;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Billing Center">
      <section aria-label="Billing summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Monthly Revenue (MRR)"
          value={formatMoney(monthlyRevenue)}
          helper={`ARR projection ${formatMoney(monthlyRevenue * 12)}`}
          href="/platform/billing-center"
        />
        <MetricCard
          label="Active Subscriptions"
          value={activeSubscriptions.length.toString()}
          helper={`${trialSubscriptions.length} on trial`}
          href="/platform/subscriptions?status=ACTIVE"
        />
        <MetricCard
          label="Expiring Within 30 Days"
          value={expiringWithin30.length.toString()}
          tone={expiringWithin30.length > 0 ? "warning" : "neutral"}
          href="/platform/subscriptions?expiry=next30"
        />
        <div className={`rounded-xl border p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] ${needsAttention > 0 ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[var(--medium-gray)] bg-white"}`}>
          <p className="text-xs font-semibold text-[#7A8091]">Needs Attention</p>
          <p className="mt-2.5 text-[22px] font-bold leading-none tracking-tight tabular-nums text-[#171A21]">
            <AttentionLink href="/platform/invoices?status=OVERDUE" count={overdueInvoices.length} label="overdue" danger />
            {" · "}
            <AttentionLink href="/platform/subscriptions?status=SUSPENDED" count={suspendedAccounts.length} label="suspended" danger />
          </p>
          <p className="mt-2 text-xs font-medium text-[#7A8091]">
            <AttentionLink href="/platform/subscriptions?status=CANCELLED" count={cancelledSubscriptions.length} label="cancelled subscriptions" />
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--medium-gray)]">
        <nav aria-label="Billing Center sections" className="flex gap-1 overflow-x-auto">
          {billingTabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildBillingTabHref(params, tab.key)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center whitespace-nowrap border-b-2 px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  active
                    ? "border-[var(--accent)] text-[var(--accent-deep)]"
                    : "border-transparent text-[#7A8091] hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171A21]">
            <SlidersHorizontal className="h-4 w-4 text-[var(--accent-deep)]" aria-hidden="true" />
            Filters
          </div>
          <input type="hidden" name="tab" value={activeTab} />
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(200px,1.3fr)_minmax(160px,1fr)_minmax(200px,1.2fr)_auto_auto] lg:items-end">
            <SearchableCombobox
              label="Business"
              name="business"
              defaultValue={params.business ?? ""}
              placeholder="All businesses"
              emptyLabel="No businesses found."
              options={[
                { value: "", label: "All businesses", description: "Show billing for every business" },
                ...businesses.map((business) => ({ value: business.name, label: business.name, description: "Business" })),
              ]}
            />
            <label className="text-sm font-medium text-[#171A21]">
              Status
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
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
                { value: "", label: "All plans", description: "Show billing for every plan" },
                ...plans.map((plan) => ({ value: plan.id.toString(), label: plan.name, description: "Subscription plan" })),
              ]}
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href={buildBillingTabHref(params, activeTab, true)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Clear
            </Link>
          </div>

          <details className="mt-3 rounded-lg border border-[var(--medium-gray)] bg-white" open={hasAdvancedFilters}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 text-sm font-semibold text-[#171A21] transition hover:bg-[var(--light-gray)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <span>Advanced filters</span>
              <span className="text-xs font-medium text-[#7A8091]">Date, revenue, trial, renewal</span>
            </summary>
            <div className="grid gap-3 border-t border-[var(--medium-gray)] p-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-[#171A21]">
                Date range
                <select name="date" defaultValue={params.date ?? "30d"} className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10">
                  <option value="30d">Last 30 Days</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </label>
              <label className="text-sm font-medium text-[#171A21]">
                From
                <input type="date" name="from" defaultValue={params.from ?? ""} className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
              </label>
              <label className="text-sm font-medium text-[#171A21]">
                To
                <input type="date" name="to" defaultValue={params.to ?? ""} className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
              </label>
              <label className="text-sm font-medium text-[#171A21]">
                Revenue min
                <input type="number" name="revenueMin" defaultValue={params.revenueMin ?? ""} placeholder="0" className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
              </label>
              <label className="text-sm font-medium text-[#171A21]">
                Revenue max
                <input type="number" name="revenueMax" defaultValue={params.revenueMax ?? ""} placeholder="10000" className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
              </label>
              <label className="text-sm font-medium text-[#171A21]">
                Trial
                <select name="trial" defaultValue={params.trial ?? ""} className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10">
                  <option value="">All trials</option>
                  <option value="trial">Trial only</option>
                  <option value="paid">Paid only</option>
                </select>
              </label>
              <label className="text-sm font-medium text-[#171A21]">
                Renewal
                <select name="renewal" defaultValue={params.renewal ?? ""} className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10">
                  <option value="">All renewals</option>
                  <option value="today">Renewing today</option>
                  <option value="week">Renewing this week</option>
                  <option value="month">Renewing this month</option>
                  <option value="overdue">Overdue renewals</option>
                </select>
              </label>
            </div>
          </details>
        </form>
      </MobileFilterDrawer>

      {activeTab === "overview" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="grid content-start gap-3">
            <MobileAccordionSection title="Billing Health Score" defaultOpen>
              <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
                <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Billing health</h2>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${billingHealth.dot}`} aria-hidden="true" />
                  <p className={`text-xl font-bold ${billingHealth.text}`}>{billingHealth.label}</p>
                </div>
                <p className="mt-1.5 text-xs text-[#7A8091]">{billingHealth.description}</p>
                <div className="mt-3 grid gap-1.5 border-t border-[var(--medium-gray)] pt-3 text-xs">
                  <HealthLine label="Outstanding invoices" value={overdueInvoices.length} danger={overdueInvoices.length > 0} />
                  <HealthLine label="Suspensions" value={suspendedAccounts.length} danger={suspendedAccounts.length > 0} />
                  <HealthLine label="Renewals in 30 days" value={expiringWithin30.length} />
                </div>
              </div>
            </MobileAccordionSection>
            <MobileAccordionSection title="Billing Alerts" defaultOpen>
              <BillingAlerts subscriptions={subscriptions} invoices={invoices} payments={payments} now={now} />
            </MobileAccordionSection>
          </div>
          <MobileAccordionSection title="Revenue Charts">
            <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
              <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Revenue &amp; growth</h2>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                <TrendSpark title="Monthly revenue" points={buildRevenueTrend(payments, recentMonths)} money />
                <TrendSpark title="Subscription growth" points={buildDateTrend(subscriptions, recentMonths, "createdAt")} />
                <TrendSpark title="Business growth" points={buildBusinessGrowth(invoices, recentMonths)} />
                <TrendSpark title="Renewal forecast" points={buildRenewalForecast(subscriptions, now)} tone="info" allLabels />
              </div>
              <div className="mt-5 grid gap-4 border-t border-[var(--medium-gray)] pt-4 md:grid-cols-2">
                <DistributionRows
                  title="Plan distribution"
                  points={plans.map((plan) => ({ label: plan.name, value: subscriptions.filter((subscription) => subscription.subscriptionPlanId === plan.id).length }))}
                />
                <DistributionRows title="Revenue by plan" points={revenueByPlan.map((plan) => ({ label: plan.name, value: plan.revenue }))} money />
              </div>
            </div>
          </MobileAccordionSection>
        </div>
      ) : null}

      {activeTab === "subscriptions" ? (
        <div className="grid gap-4">
          <MobileAccordionSection title="Subscription Management" defaultOpen>
            <SectionCard title="Subscription Management">
              <AdvancedSubscriptionTable subscriptions={filteredSubscriptions} />
            </SectionCard>
          </MobileAccordionSection>
          <MobileAccordionSection title="Renewal Center">
            <RenewalCenter subscriptions={subscriptions} now={now} />
          </MobileAccordionSection>
          <MobileAccordionSection title="Trial Management">
            <TrialManagement subscriptions={trialSubscriptions} />
          </MobileAccordionSection>
        </div>
      ) : null}

      {activeTab === "invoices" ? (
        <div className="grid gap-4">
          <MobileAccordionSection title="Invoice Management" defaultOpen>
            <InvoiceStatusDashboard invoices={invoices} />
          </MobileAccordionSection>
          <MobileAccordionSection title="Invoice Table">
            <InvoiceTable invoices={filteredInvoices} />
          </MobileAccordionSection>
          <MobileAccordionSection title="Payment Tracking">
            <PaymentTracking payments={payments} now={now} monthStart={monthStart} yearStart={yearStart} outstandingRevenue={outstandingRevenue} overdueRevenue={overdueRevenue} />
          </MobileAccordionSection>
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="grid gap-4">
          <MobileAccordionSection title="Plan Performance" defaultOpen>
            <PlanPerformance plans={plans} subscriptions={subscriptions} payments={payments} />
          </MobileAccordionSection>
          <MobileAccordionSection title="Churn Analytics">
            <ChurnAnalytics subscriptions={subscriptions} />
          </MobileAccordionSection>
          <MobileAccordionSection title="Revenue Summary">
            <SectionCard title="Revenue Summary Panel">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <MetricCard label="Today Revenue" value={formatMoney(todayRevenue)} className="h-full" />
                <MetricCard label="This Month Revenue" value={formatMoney(monthlyRevenue)} className="h-full" />
                <MetricCard label="Last Month Revenue" value={formatMoney(lastMonthRevenue)} className="h-full" />
                <MetricCard label="Year To Date Revenue" value={formatMoney(ytdRevenue)} className="h-full" />
                <MetricCard label="Average Revenue Per Business" value={formatMoney(averageRevenuePerBusiness)} className="h-full" />
                <MetricCard label="Highest Revenue Plan" value={highestRevenuePlan} className="h-full" />
                <MetricCard label="Lowest Revenue Plan" value={lowestRevenuePlan} className="h-full" />
              </div>
            </SectionCard>
          </MobileAccordionSection>
          <MobileAccordionSection title="Financial Exports">
            <section className="flex flex-col gap-3 rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] lg:flex-row lg:items-center lg:justify-between lg:p-5">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Financial exports</h2>
                <p className="mt-0.5 text-xs text-[#7A8091]">Filter-aware billing reports in your preferred format.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <ExportButton href={`/platform/billing-center/export?${buildQuery(params)}&format=csv`} icon={<Download className="h-4 w-4" aria-hidden="true" />} label="CSV" />
                <ExportButton href={`/platform/billing-center/export?${buildQuery(params)}&format=excel`} icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />} label="Excel" />
                <ExportButton href={`/platform/billing-center/export?${buildQuery(params)}&format=pdf`} icon={<FileText className="h-4 w-4" aria-hidden="true" />} label="PDF" />
              </div>
            </section>
          </MobileAccordionSection>
        </div>
      ) : null}
    </DashboardShell>
  );
}

const billingTabs = [
  { key: "overview", label: "Overview" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "invoices", label: "Invoices" },
  { key: "analytics", label: "Analytics" },
] as const;

type BillingTabKey = (typeof billingTabs)[number]["key"];

function getBillingTab(value?: string): BillingTabKey {
  return billingTabs.some((tab) => tab.key === value) ? (value as BillingTabKey) : "overview";
}

function buildBillingTabHref(params: BillingParams, tab: BillingTabKey, clearFilters = false) {
  const query = new URLSearchParams();
  query.set("tab", tab);
  if (!clearFilters) {
    for (const [key, value] of Object.entries(params)) {
      if (value && !["tab", "export"].includes(key)) {
        query.set(key, value);
      }
    }
  }
  return "/platform/billing-center?" + query.toString();
}

function AttentionLink({ href, count, label, danger = false }: { href: string; count: number; label: string; danger?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-md transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
        danger && count > 0 ? "text-[#B91C1C]" : ""
      }`}
    >
      <span className="tabular-nums">{count}</span> <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function AdvancedSubscriptionTable({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {subscriptions.map((subscription) => (
          <SubscriptionMobileCard key={subscription.id} subscription={subscription} />
        ))}
        {subscriptions.length === 0 ? <EmptyState title="No subscriptions match these filters." className="py-8" /> : null}
      </div>
      <div className="hidden md:block">
        <DataTable className="min-w-[960px] table-fixed">
          <DataTableHeader>
            <tr>
              <DataTableHeadCell className="w-[19%] pl-4">Business</DataTableHeadCell>
              <DataTableHeadCell className="w-[17%]">Plan</DataTableHeadCell>
              <DataTableHeadCell className="w-[15%]">Status</DataTableHeadCell>
              <DataTableHeadCell className="w-[12%]">Expiry</DataTableHeadCell>
              <DataTableHeadCell className="w-[12%]">Remaining</DataTableHeadCell>
              <DataTableHeadCell className="w-[12%] text-right">Value</DataTableHeadCell>
              <DataTableHeadCell className="pr-4">Actions</DataTableHeadCell>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {subscriptions.map((subscription) => {
              const annual = getAnnualSubscriptionValue(subscription);
              const monthly = annual / 12;
              const remaining = getSubscriptionRemainingDays(subscription);
              const trialDays = getTrialRemainingDays(subscription);
              return (
                <tr key={subscription.id} className="align-middle">
                  <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
                    <p className="truncate font-semibold text-[#171A21]">{subscription.business.name}</p>
                    <p className="truncate text-xs text-[#7A8091]">by {subscription.auditLogs[0]?.user?.name ?? "System"}</p>
                  </td>
                  <DataTableCell>
                    <p className="truncate font-medium text-[#3D4352]">{subscription.subscriptionPlan.name}</p>
                    <p className="truncate text-xs text-[#7A8091]">
                      {formatBillingCycle(subscription.billingCycle)} · since {formatDate(subscription.startDate)}
                    </p>
                  </DataTableCell>
                  <DataTableCell>
                    <LifecycleBadge status={deriveLifecycleStatus(subscription)} />
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <p>{subscription.expiryDate ? formatDate(subscription.expiryDate) : "—"}</p>
                    {subscription.renewalDate ? <p className="text-xs text-[#7A8091]">renews {formatDate(subscription.renewalDate)}</p> : null}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <RemainingDays days={remaining} />
                    {trialDays !== null ? <p className="text-xs text-[#7A8091]">Trial: {trialDays} left</p> : null}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-right">
                    <p className="font-semibold tabular-nums text-[#171A21]">{formatMoney(monthly)}/mo</p>
                    <p className="text-xs tabular-nums text-[#7A8091]">{formatMoney(annual)}/yr</p>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap pr-4">
                    <div className="flex items-center gap-1.5">
                      <ButtonLink href={`/platform/businesses/${subscription.business.uuid}`} variant="primary" size="sm">
                        View
                      </ButtonLink>
                      <ButtonLink href="/platform/subscriptions" variant="outline" size="sm">
                        Manage
                      </ButtonLink>
                    </div>
                  </DataTableCell>
                </tr>
              );
            })}
          </DataTableBody>
        </DataTable>
        {subscriptions.length === 0 ? <EmptyState title="No subscriptions match these filters." className="my-4 py-8" /> : null}
      </div>
    </>
  );
}

function SubscriptionMobileCard({ subscription }: { subscription: SubscriptionRow }) {
  const annual = getAnnualSubscriptionValue(subscription);
  const monthly = annual / 12;
  const remaining = getSubscriptionRemainingDays(subscription);
  const trialDays = getTrialRemainingDays(subscription);
  return (
    <article className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-[#171A21]">{subscription.business.name}</h3>
          <p className="mt-1 truncate text-xs text-[#7A8091]">
            {subscription.subscriptionPlan.name} · {formatBillingCycle(subscription.billingCycle)} · by {subscription.auditLogs[0]?.user?.name ?? "System"}
          </p>
        </div>
        <LifecycleBadge status={deriveLifecycleStatus(subscription)} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <MobileLine label="Expiry" value={subscription.expiryDate ? formatDate(subscription.expiryDate) : "—"} />
        <MobileLine label="Remaining" value={remaining === null ? "—" : `${remaining} days`} warn={remaining !== null && remaining <= 30} />
        <MobileLine label="Renewal" value={subscription.renewalDate ? formatDate(subscription.renewalDate) : "—"} />
        <MobileLine label="Trial" value={trialDays === null ? "Not trial" : `${trialDays} days left`} />
        <MobileLine label="Monthly" value={formatMoney(monthly)} />
        <MobileLine label="Annual" value={formatMoney(annual)} />
      </dl>
      <div className="mt-3 flex items-center gap-2">
        <ButtonLink href={`/platform/businesses/${subscription.business.uuid}`} variant="primary" size="sm" className="flex-1">
          View
        </ButtonLink>
        <ButtonLink href="/platform/subscriptions" variant="outline" size="sm" className="flex-1">
          Manage
        </ButtonLink>
      </div>
    </article>
  );
}

function MobileLine({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[#7A8091]">{label}</dt>
      <dd className={`text-right font-semibold ${warn ? "text-[#B25E09]" : "text-[#171A21]"}`}>{value}</dd>
    </div>
  );
}

function RemainingDays({ days }: { days: number | null }) {
  if (days === null) return <span className="text-[#7A8091]">—</span>;
  const className = days <= 7 ? "font-semibold text-[#B91C1C]" : days <= 30 ? "font-semibold text-[#B25E09]" : "text-[#3D4352]";
  return (
    <span className={`tabular-nums ${className}`}>
      {days} {days === 1 ? "day" : "days"}
    </span>
  );
}

function RenewalCenter({ subscriptions, now }: { subscriptions: SubscriptionRow[]; now: Date }) {
  const today = subscriptions.filter((subscription) => daysUntil(subscription.renewalDate, now) === 0);
  const week = subscriptions.filter((subscription) => {
    const days = daysUntil(subscription.renewalDate, now);
    return days !== null && days >= 0 && days <= 7;
  });
  const month = subscriptions.filter((subscription) => {
    const days = daysUntil(subscription.renewalDate, now);
    return days !== null && days >= 0 && days <= 30;
  });
  const overdue = subscriptions.filter((subscription) => {
    const days = daysUntil(subscription.renewalDate, now);
    return days !== null && days < 0 && !["CANCELLED", "SUSPENDED"].includes(subscription.status);
  });
  return (
    <SectionCard title="Renewal Center">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Renewing Today" value={today.length.toString()} className="h-full" />
        <MetricCard label="Renewing This Week" value={week.length.toString()} className="h-full" />
        <MetricCard label="Renewing This Month" value={month.length.toString()} className="h-full" />
        <MetricCard label="Overdue Renewals" value={overdue.length.toString()} tone={overdue.length > 0 ? "danger" : "neutral"} className="h-full" />
      </div>
      <div className="mt-4 grid gap-2">
        {month.slice(0, 6).map((subscription) => (
          <BillingActionRow
            key={subscription.id}
            title={subscription.business.name}
            meta={`${subscription.subscriptionPlan.name} · ${subscription.renewalDate ? formatDate(subscription.renewalDate) : "No renewal date"}`}
            viewHref={`/platform/businesses/${subscription.business.uuid}`}
          />
        ))}
        {month.length === 0 ? <EmptyState title="No upcoming renewals in this window." className="p-4 md:p-4" /> : null}
      </div>
    </SectionCard>
  );
}

function TrialManagement({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  return (
    <SectionCard title="Trial Management">
      <div className="grid gap-2">
        {subscriptions.map((subscription) => (
          <BillingActionRow
            key={subscription.id}
            title={subscription.business.name}
            meta={`Trial: ${subscription.trialStartDate ? formatDate(subscription.trialStartDate) : "—"} to ${subscription.trialEndDate ? formatDate(subscription.trialEndDate) : "—"} · ${getTrialRemainingDays(subscription) ?? 0} days remaining`}
            viewHref={`/platform/businesses/${subscription.business.uuid}`}
          />
        ))}
        {subscriptions.length === 0 ? <EmptyState title="No trial subscriptions are currently active." className="p-4 md:p-4" /> : null}
      </div>
    </SectionCard>
  );
}

function BillingActionRow({ title, meta, viewHref }: { title: string; meta: string; viewHref: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--medium-gray)] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#171A21]">{title}</p>
        <p className="mt-0.5 truncate text-xs text-[#7A8091]">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <ButtonLink href={viewHref} variant="outline" size="sm">
          View
        </ButtonLink>
        <ButtonLink href="/platform/subscriptions" variant="outline" size="sm">
          Manage
        </ButtonLink>
      </div>
    </div>
  );
}

function PlanPerformance({ plans, subscriptions, payments }: { plans: Awaited<ReturnType<typeof prisma.subscriptionPlan.findMany>>; subscriptions: SubscriptionRow[]; payments: Array<{ amount: Prisma.Decimal; paidAt: Date; invoice: { subscription: { subscriptionPlanId: number; subscriptionPlan: { name: string } } } }> }) {
  const revenueByPlan = calculateRevenueByPlan(payments, plans);
  return (
    <SectionCard title="Plan Performance">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const planSubscriptions = subscriptions.filter((subscription) => subscription.subscriptionPlanId === plan.id);
          const revenue = revenueByPlan.find((item) => item.id === plan.id)?.revenue ?? 0;
          const cancellations = planSubscriptions.filter((subscription) => subscription.status === "CANCELLED").length;
          const renewals = planSubscriptions.filter((subscription) => subscription.renewalDate).length;
          const churnRate = planSubscriptions.length ? Math.round((cancellations / planSubscriptions.length) * 100) : 0;
          const avgDuration = averageDurationDays(planSubscriptions);
          return (
            <article key={plan.id} className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
              <h3 className="font-bold tracking-tight text-[#171A21]">{plan.name}</h3>
              <dl className="mt-3 grid gap-1.5 text-xs">
                <MobileLine label="Businesses" value={new Set(planSubscriptions.map((subscription) => subscription.businessId)).size.toString()} />
                <MobileLine label="Revenue" value={formatMoney(revenue)} />
                <MobileLine label="Renewals" value={renewals.toString()} />
                <MobileLine label="Cancellations" value={cancellations.toString()} warn={cancellations > 0} />
                <MobileLine label="Churn Rate" value={`${churnRate}%`} warn={churnRate > 0} />
                <MobileLine label="Average Duration" value={`${avgDuration} days`} />
              </dl>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function InvoiceStatusDashboard({ invoices }: { invoices: InvoiceRow[] }) {
  const statuses = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"];
  const partiallyPaid = invoices.filter((invoice) => invoice.payments.length > 0 && invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) < Number(invoice.amount)).length;
  return (
    <SectionCard title="Invoice Management">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {statuses.map((status) => {
          const count = invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === status).length;
          return (
            <MetricCard
              key={status}
              label={status === "OVERDUE" ? "Overdue" : titleCase(status)}
              value={count.toString()}
              tone={status === "OVERDUE" && count > 0 ? "danger" : status === "PAID" ? "success" : "neutral"}
              className="h-full"
            />
          );
        })}
        <MetricCard label="Partially Paid" value={partiallyPaid.toString()} tone={partiallyPaid > 0 ? "warning" : "neutral"} className="h-full" />
      </div>
    </SectionCard>
  );
}

function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <SectionCard title="Invoice Table">
      <div className="grid gap-3 md:hidden">
        {invoices.slice(0, 20).map((invoice) => (
          <InvoiceMobileCard key={invoice.id} invoice={invoice} />
        ))}
        {invoices.length === 0 ? <EmptyState title="No invoices match these filters." className="py-8" /> : null}
      </div>
      <div className="hidden md:block">
        <DataTable className="min-w-[820px] table-fixed">
          <DataTableHeader>
            <tr>
              <DataTableHeadCell className="w-[20%] pl-4">Invoice</DataTableHeadCell>
              <DataTableHeadCell className="w-[26%]">Business</DataTableHeadCell>
              <DataTableHeadCell className="w-[15%] text-right">Amount</DataTableHeadCell>
              <DataTableHeadCell className="w-[13%]">Status</DataTableHeadCell>
              <DataTableHeadCell className="w-[16%]">Due</DataTableHeadCell>
              <DataTableHeadCell className="pr-4">Actions</DataTableHeadCell>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {invoices.slice(0, 20).map((invoice) => {
              const displayStatus = getInvoiceDisplayStatus(invoice);
              return (
                <tr key={invoice.id} className="align-middle">
                  <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
                    <p className="truncate font-semibold text-[#171A21]">{invoice.invoiceNumber}</p>
                    <p className="truncate text-xs text-[#7A8091]">Issued {formatDate(invoice.invoiceDate)}</p>
                  </td>
                  <DataTableCell>
                    <p className="truncate font-medium text-[#3D4352]">{invoice.business.name}</p>
                    <p className="truncate text-xs text-[#7A8091]">{invoice.subscription.subscriptionPlan.name}</p>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-[#171A21]">
                    {formatMoney(invoice.amount, invoice.currency)}
                  </DataTableCell>
                  <DataTableCell>
                    <LifecycleBadge status={displayStatus} />
                  </DataTableCell>
                  <DataTableCell className={`whitespace-nowrap ${displayStatus === "OVERDUE" ? "font-semibold text-[#B91C1C]" : ""}`}>
                    <p>{formatDate(invoice.dueDate)}</p>
                    {invoice.payments[0] ? <p className="text-xs font-normal text-[#7A8091]">paid {formatDate(invoice.payments[0].paidAt)}</p> : null}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap pr-4">
                    <ButtonLink href={`/platform/invoices/${invoice.uuid}`} variant="primary" size="sm">
                      View
                    </ButtonLink>
                  </DataTableCell>
                </tr>
              );
            })}
          </DataTableBody>
        </DataTable>
        {invoices.length === 0 ? <EmptyState title="No invoices match these filters." className="my-4 py-8" /> : null}
      </div>
    </SectionCard>
  );
}

function InvoiceMobileCard({ invoice }: { invoice: InvoiceRow }) {
  const displayStatus = getInvoiceDisplayStatus(invoice);
  return (
    <article className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-[#171A21]">{invoice.invoiceNumber}</h3>
          <p className="mt-1 truncate text-xs text-[#7A8091]">
            {invoice.business.name} · {invoice.subscription.subscriptionPlan.name}
          </p>
        </div>
        <LifecycleBadge status={displayStatus} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <MobileLine label="Amount" value={formatMoney(invoice.amount, invoice.currency)} />
        <MobileLine label="Due" value={formatDate(invoice.dueDate)} warn={displayStatus === "OVERDUE"} />
        <MobileLine label="Issued" value={formatDate(invoice.invoiceDate)} />
        <MobileLine label="Payment" value={invoice.payments[0] ? formatDate(invoice.payments[0].paidAt) : "—"} />
      </dl>
      <div className="mt-3">
        <ButtonLink href={`/platform/invoices/${invoice.uuid}`} variant="primary" size="sm" className="w-full">
          View
        </ButtonLink>
      </div>
    </article>
  );
}

function PaymentTracking({ payments, now, monthStart, yearStart, outstandingRevenue, overdueRevenue }: { payments: Array<{ amount: Prisma.Decimal; paidAt: Date }>; now: Date; monthStart: Date; yearStart: Date; outstandingRevenue: number; overdueRevenue: number }) {
  return (
    <SectionCard title="Payment Tracking">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <MetricCard label="Payments Received Today" value={formatMoney(sumPayments(payments.filter((payment) => isSameUtcDay(payment.paidAt, now))))} className="h-full" />
        <MetricCard label="This Month" value={formatMoney(sumPayments(payments.filter((payment) => payment.paidAt >= monthStart)))} className="h-full" />
        <MetricCard label="This Year" value={formatMoney(sumPayments(payments.filter((payment) => payment.paidAt >= yearStart)))} className="h-full" />
        <MetricCard label="Outstanding Revenue" value={formatMoney(outstandingRevenue)} tone={outstandingRevenue > 0 ? "warning" : "neutral"} className="h-full" />
        <MetricCard label="Overdue Revenue" value={formatMoney(overdueRevenue)} tone={overdueRevenue > 0 ? "danger" : "neutral"} className="h-full" />
        <MetricCard label="Collected Revenue" value={formatMoney(sumPayments(payments))} tone="success" className="h-full" />
      </div>
    </SectionCard>
  );
}

function ChurnAnalytics({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  const cancelled = subscriptions.filter((subscription) => subscription.status === "CANCELLED");
  const suspended = subscriptions.filter((subscription) => subscription.status === "SUSPENDED");
  const failedRenewals = subscriptions.filter((subscription) => {
    const days = daysUntil(subscription.renewalDate, new Date());
    return days !== null && days < 0 && subscription.status !== "ACTIVE";
  });
  return (
    <SectionCard title="Churn Analytics">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <MetricCard label="Cancelled Accounts" value={cancelled.length.toString()} tone={cancelled.length > 0 ? "warning" : "neutral"} className="h-full" />
        <MetricCard label="Suspended Accounts" value={suspended.length.toString()} tone={suspended.length > 0 ? "danger" : "neutral"} className="h-full" />
        <MetricCard label="Failed Renewals" value={failedRenewals.length.toString()} tone={failedRenewals.length > 0 ? "warning" : "neutral"} className="h-full" />
        <MetricCard label="Average Subscription Lifetime" value={`${averageDurationDays(subscriptions)} days`} className="h-full" />
        <MetricCard label="Most Common Plan Downgrades" value="—" helper="Not tracked yet" className="h-full" />
        <MetricCard label="Most Common Cancellation Reasons" value="—" helper="Not tracked yet" className="h-full" />
      </div>
    </SectionCard>
  );
}

type BillingAlert = { severity: "danger" | "warning" | "success"; text: string };

function BillingAlerts({ subscriptions, invoices, payments, now }: { subscriptions: SubscriptionRow[]; invoices: InvoiceRow[]; payments: Array<{ paidAt: Date; invoice: { business: { name: string }; subscription: { subscriptionPlan: { name: string } } } }>; now: Date }) {
  const alerts: BillingAlert[] = [
    ...invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "OVERDUE").map((invoice): BillingAlert => ({ severity: "danger", text: `Invoice overdue: ${invoice.invoiceNumber}` })),
    ...subscriptions.filter((subscription) => daysUntil(subscription.expiryDate, now) === 7).map((subscription): BillingAlert => ({ severity: "warning", text: `Subscription expires in 7 days: ${subscription.business.name}` })),
    ...subscriptions.filter((subscription) => daysUntil(subscription.expiryDate, now) === 30).map((subscription): BillingAlert => ({ severity: "warning", text: `Subscription expires in 30 days: ${subscription.business.name}` })),
    ...subscriptions.filter((subscription) => subscription.status === "TRIAL" && (getTrialRemainingDays(subscription) ?? 99) <= 7).map((subscription): BillingAlert => ({ severity: "warning", text: `Trial ending soon: ${subscription.business.name}` })),
    ...payments.slice(0, 3).map((payment): BillingAlert => ({ severity: "success", text: `Payment recorded: ${payment.invoice.business.name}` })),
  ];
  return (
    <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Billing alerts</h2>
      <div className="mt-3 grid gap-2 text-sm">
        {alerts.slice(0, 12).map((alert) => (
          <p key={alert.text} className="flex items-start gap-2 text-[#3D4352]">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                alert.severity === "danger" ? "bg-[#E24B4A]" : alert.severity === "warning" ? "bg-[#EF9F27]" : "bg-[#1D9E75]"
              }`}
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">{alert.text}</span>
          </p>
        ))}
        {alerts.length === 0 ? <p className="rounded-lg border border-dashed border-[#D8DBE2] bg-[var(--app-canvas)] p-3 text-sm text-[#7A8091]">No billing alerts require attention.</p> : null}
        <p className="mt-1 border-t border-[var(--light-gray)] pt-2.5 text-xs text-[#7A8091]">
          Billing reminders and renewal notices can be managed manually from Subscription Management.
        </p>
      </div>
    </div>
  );
}

function TrendSpark({ title, points, money = false, tone = "default", allLabels = false }: { title: string; points: ChartPoint[]; money?: boolean; tone?: "default" | "info"; allLabels?: boolean }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const barColor = tone === "info" ? "bg-[#378ADD]" : "bg-[var(--accent)]";

  return (
    <div>
      <p className="text-xs font-medium text-[#7A8091]">{title}</p>
      <div className="mt-2 flex h-16 items-end gap-1 border-b border-[var(--medium-gray)]">
        {points.map((point) => (
          <span
            key={point.label}
            title={`${point.label}: ${money ? formatMoney(point.value) : point.value}`}
            className={`min-w-0 flex-1 rounded-t ${barColor}`}
            style={{ height: `${Math.max(5, (point.value / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-[#9AA0AD]">
        {allLabels ? (
          points.map((point) => <span key={point.label}>{point.label}</span>)
        ) : (
          <>
            <span>{points[0]?.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </>
        )}
      </div>
      <p className="sr-only">{points.map((point) => `${point.label}: ${money ? formatMoney(point.value) : point.value}`).join(", ")}</p>
    </div>
  );
}

function DistributionRows({ title, points, money = false }: { title: string; points: ChartPoint[]; money?: boolean }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return (
    <div>
      <p className="text-xs font-medium text-[#7A8091]">{title}</p>
      <div className="mt-2 grid gap-2">
        {points.map((point) => {
          const percent = total > 0 ? Math.round((point.value / total) * 100) : 0;
          return (
            <div key={point.label}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold text-[#171A21]">{point.label}</span>
                <span className="whitespace-nowrap font-semibold tabular-nums text-[#3D4352]">
                  {money ? formatMoney(point.value) : point.value} <span className="font-medium text-[#9AA0AD]">({percent}%)</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--light-gray)]">
                <div className="h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthLine({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#3D4352]">{label}</span>
      <strong className={`tabular-nums ${danger ? "text-[#B91C1C]" : "text-[#171A21]"}`}>{value}</strong>
    </div>
  );
}

function LifecycleBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE" || status === "PAID"
      ? "success"
      : status === "TRIAL" || status === "PENDING_RENEWAL" || status === "ISSUED"
        ? "brand"
        : status === "EXPIRED" || status === "SUSPENDED" || status === "OVERDUE"
          ? "danger"
          : "neutral";
  return (
    <StatusBadge tone={tone} className="whitespace-nowrap">
      {titleCase(status)}
    </StatusBadge>
  );
}

function ExportButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
    >
      {icon}
      {label}
    </Link>
  );
}

function matchesSubscriptionFilters(subscription: SubscriptionRow, params: BillingParams, dateRange: { from: Date; to: Date }, now: Date) {
  if (params.business && !subscription.business.name.toLowerCase().includes(params.business.toLowerCase())) return false;
  if (params.plan && subscription.subscriptionPlanId !== Number(params.plan)) return false;
  if (params.status && deriveLifecycleStatus(subscription) !== params.status && subscription.status !== params.status) return false;
  if (subscription.createdAt < dateRange.from || subscription.createdAt > dateRange.to) return false;
  const monthly = getAnnualSubscriptionValue(subscription) / 12;
  if (params.revenueMin && monthly < Number(params.revenueMin)) return false;
  if (params.revenueMax && monthly > Number(params.revenueMax)) return false;
  if (params.trial === "trial" && subscription.status !== "TRIAL") return false;
  if (params.trial === "paid" && subscription.status === "TRIAL") return false;
  if (params.renewal) {
    const days = daysUntil(subscription.renewalDate, now);
    if (params.renewal === "today" && days !== 0) return false;
    if (params.renewal === "week" && (days === null || days < 0 || days > 7)) return false;
    if (params.renewal === "month" && (days === null || days < 0 || days > 30)) return false;
    if (params.renewal === "overdue" && (days === null || days >= 0)) return false;
  }
  return true;
}

function getAnnualSubscriptionValue(subscription: SubscriptionRow) {
  if (subscription.billingCycle === "MONTHLY") {
    return Number(subscription.subscriptionPlan.monthlyPrice) * 12;
  }

  return Number(subscription.subscriptionPlan.annualPrice);
}

function matchesInvoiceFilters(invoice: InvoiceRow, params: BillingParams, dateRange: { from: Date; to: Date }) {
  if (params.business && !invoice.business.name.toLowerCase().includes(params.business.toLowerCase())) return false;
  if (params.plan && invoice.subscription.subscriptionPlanId !== Number(params.plan)) return false;
  if (invoice.createdAt < dateRange.from || invoice.createdAt > dateRange.to) return false;
  const amount = Number(invoice.amount);
  if (params.revenueMin && amount < Number(params.revenueMin)) return false;
  if (params.revenueMax && amount > Number(params.revenueMax)) return false;
  return true;
}

function deriveLifecycleStatus(subscription: SubscriptionRow) {
  const now = new Date();
  if (subscription.status === "TRIAL") return "TRIAL";
  if (subscription.status === "SUSPENDED") return "SUSPENDED";
  if (subscription.status === "CANCELLED") return "CANCELLED";
  if (subscription.status === "EXPIRED" || (subscription.expiryDate && subscription.expiryDate < now)) return "EXPIRED";
  const remaining = getSubscriptionRemainingDays(subscription);
  if (remaining !== null && remaining >= 0 && remaining <= 14) return "PENDING_RENEWAL";
  return subscription.status;
}

function getDateRange(params: BillingParams, now: Date) {
  if (params.date === "custom" && params.from && params.to) return { from: new Date(`${params.from}T00:00:00.000Z`), to: new Date(`${params.to}T23:59:59.999Z`) };
  if (params.date === "7d") return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  if (params.date === "month") return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to: now };
  return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
}

function sumPayments(payments: Array<{ amount: Prisma.Decimal | number }>) {
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

function calculateRevenueByPlan(payments: Array<{ amount: Prisma.Decimal; invoice: { subscription: { subscriptionPlanId: number; subscriptionPlan: { name: string } } } }>, plans: Array<{ id: number; name: string }>) {
  return plans
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      revenue: sumPayments(payments.filter((payment) => payment.invoice.subscription.subscriptionPlanId === plan.id)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function getRecentMonths(now: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1));
    return { key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`, label: date.toLocaleString("en", { month: "short" }) };
  });
}

function buildRevenueTrend(payments: Array<{ amount: Prisma.Decimal; paidAt: Date }>, months: Array<{ key: string; label: string }>): ChartPoint[] {
  return months.map((month) => ({
    label: month.label,
    value: sumPayments(payments.filter((payment) => `${payment.paidAt.getUTCFullYear()}-${payment.paidAt.getUTCMonth()}` === month.key)),
  }));
}

function buildDateTrend<T extends { createdAt: Date }>(rows: T[], months: Array<{ key: string; label: string }>, field: "createdAt"): ChartPoint[] {
  return months.map((month) => ({ label: month.label, value: rows.filter((row) => `${row[field].getUTCFullYear()}-${row[field].getUTCMonth()}` === month.key).length }));
}

function buildBusinessGrowth(invoices: InvoiceRow[], months: Array<{ key: string; label: string }>): ChartPoint[] {
  return months.map((month) => ({
    label: month.label,
    value: new Set(invoices.filter((invoice) => `${invoice.createdAt.getUTCFullYear()}-${invoice.createdAt.getUTCMonth()}` === month.key).map((invoice) => invoice.businessId)).size,
  }));
}

function buildRenewalForecast(subscriptions: SubscriptionRow[], now: Date): ChartPoint[] {
  const windows = [
    { label: "Today", max: 0 },
    { label: "7 Days", max: 7 },
    { label: "30 Days", max: 30 },
    { label: "60 Days", max: 60 },
  ];
  return windows.map((window) => ({
    label: window.label,
    value: subscriptions.filter((subscription) => {
      const days = daysUntil(subscription.renewalDate, now);
      return days !== null && days >= 0 && days <= window.max;
    }).length,
  }));
}

function daysUntil(date: Date | null, now: Date) {
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function averageDurationDays(subscriptions: SubscriptionRow[]) {
  if (subscriptions.length === 0) return 0;
  const now = new Date();
  const total = subscriptions.reduce((sum, subscription) => {
    const end = subscription.endDate ?? subscription.expiryDate ?? now;
    return sum + Math.max(0, Math.round((end.getTime() - subscription.startDate.getTime()) / (24 * 60 * 60 * 1000)));
  }, 0);
  return Math.round(total / subscriptions.length);
}

function getBillingHealth({ overdueInvoices, suspendedAccounts, expiringWithin30 }: { overdueInvoices: number; suspendedAccounts: number; expiringWithin30: number }) {
  if (overdueInvoices > 0 || suspendedAccounts > 0)
    return { label: "At Risk", description: "Overdue invoices or suspended accounts require immediate attention.", dot: "bg-[#E24B4A]", text: "text-[#B91C1C]" };
  if (expiringWithin30 > 0)
    return { label: "Attention Needed", description: "Upcoming renewals should be reviewed.", dot: "bg-[#EF9F27]", text: "text-[#B25E09]" };
  return { label: "Healthy", description: "No urgent billing issues detected.", dot: "bg-[#1D9E75]", text: "text-[#1D7A46]" };
}

function buildQuery(params: BillingParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return query.toString();
}

function isSameUtcDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
