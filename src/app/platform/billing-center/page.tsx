import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileAccordionSection } from "@/components/MobileAccordionSection";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { SearchableCombobox } from "@/components/SearchableCombobox";
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

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Billing Center">
      <PlatformKpiGrid className="md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={CircleDollarSign} label="Monthly Revenue (MRR)" value={formatMoney(monthlyRevenue)} />
        <KpiCard icon={TrendingUp} label="Annual Revenue Projection (ARR)" value={formatMoney(monthlyRevenue * 12)} />
        <KpiCard icon={CreditCard} label="Active Subscriptions" value={activeSubscriptions.length.toString()} />
        <KpiCard icon={CalendarClock} label="Trial Subscriptions" value={trialSubscriptions.length.toString()} />
        <KpiCard icon={AlertTriangle} label="Expiring Within 30 Days" value={expiringWithin30.length.toString()} tone={expiringWithin30.length > 0 ? "warn" : "default"} />
        <KpiCard icon={Receipt} label="Overdue Invoices" value={overdueInvoices.length.toString()} tone={overdueInvoices.length > 0 ? "danger" : "default"} />
        <KpiCard icon={AlertTriangle} label="Suspended Accounts" value={suspendedAccounts.length.toString()} tone={suspendedAccounts.length > 0 ? "danger" : "default"} />
        <KpiCard icon={TrendingDown} label="Cancelled Subscriptions" value={cancelledSubscriptions.length.toString()} />
      </PlatformKpiGrid>

      <MobileFilterDrawer activeCount={activeFilterCount}>
        <section className="sticky top-0 z-10 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
            <h2 className="font-semibold text-[#111827]">Global Filters</h2>
          </div>
          <form className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_minmax(220px,260px)_auto_auto] lg:items-end">
            <input type="hidden" name="tab" value={activeTab} />
            <div>
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
            </div>
            <label className="text-sm font-medium text-[#111827]">
              Status
              <select name="status" defaultValue={params.status ?? ""} className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
                <option value="">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
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
            <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">Apply</button>
            <Link href={buildBillingTabHref(params, activeTab, true)} className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">Clear</Link>

            <details className="lg:col-span-5 rounded-md border border-[#E5E7EB] bg-[#FAFAFA]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-[#111827]">
                <span>Advanced filters</span>
                <span className="text-xs font-medium text-[#6B7280]">Date, revenue, trial, renewal</span>
              </summary>
              <div className="grid gap-3 border-t border-[#E5E7EB] p-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm font-medium text-[#111827]">
                  Date range
                  <select name="date" defaultValue={params.date ?? "30d"} className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
                    <option value="30d">Last 30 Days</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </label>
                <input type="date" name="from" defaultValue={params.from ?? ""} className="h-10 self-end rounded-md border border-[#E5E7EB] px-3 text-sm" aria-label="From date" />
                <input type="date" name="to" defaultValue={params.to ?? ""} className="h-10 self-end rounded-md border border-[#E5E7EB] px-3 text-sm" aria-label="To date" />
                <input type="number" name="revenueMin" defaultValue={params.revenueMin ?? ""} placeholder="Revenue min" className="h-10 self-end rounded-md border border-[#E5E7EB] px-3 text-sm" />
                <input type="number" name="revenueMax" defaultValue={params.revenueMax ?? ""} placeholder="Revenue max" className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" />
                <select name="trial" defaultValue={params.trial ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" aria-label="Trial filter">
                  <option value="">All trials</option>
                  <option value="trial">Trial only</option>
                  <option value="paid">Paid only</option>
                </select>
                <select name="renewal" defaultValue={params.renewal ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" aria-label="Renewal filter">
                  <option value="">All renewals</option>
                  <option value="today">Renewing today</option>
                  <option value="week">Renewing this week</option>
                  <option value="month">Renewing this month</option>
                  <option value="overdue">Overdue renewals</option>
                </select>
              </div>
            </details>
          </form>
        </section>
      </MobileFilterDrawer>

      <BillingCenterTabs activeTab={activeTab} params={params} />

      {activeTab === "overview" ? (
        <div className="grid gap-4">
          <MobileAccordionSection title="Billing Alerts" defaultOpen>
            <BillingAlerts subscriptions={subscriptions} invoices={invoices} payments={payments} now={now} />
          </MobileAccordionSection>
          <MobileAccordionSection title="Revenue Charts">
            <Panel title="Revenue Charts">
              <div className="grid gap-4 xl:grid-cols-2">
                <Chart title="Monthly Revenue Trend" points={buildRevenueTrend(payments, recentMonths)} money />
                <Chart title="Subscription Growth Trend" points={buildDateTrend(subscriptions, recentMonths, "createdAt")} />
                <Chart title="Business Growth Trend" points={buildBusinessGrowth(invoices, recentMonths)} />
                <Distribution title="Plan Distribution" points={plans.map((plan) => ({ label: plan.name, value: subscriptions.filter((subscription) => subscription.subscriptionPlanId === plan.id).length }))} />
                <Distribution title="Revenue by Plan" points={revenueByPlan.map((plan) => ({ label: plan.name, value: plan.revenue }))} money />
                <Chart title="Renewal Forecast" points={buildRenewalForecast(subscriptions, now)} />
              </div>
            </Panel>
          </MobileAccordionSection>
          <MobileAccordionSection title="Billing Health Score">
            <Panel title="Billing Health Score">
              <div className="flex flex-col gap-4">
                <div className={`rounded-md border p-4 ${billingHealth.tone}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Billing health</p>
                  <p className="mt-2 text-3xl font-semibold">{billingHealth.label}</p>
                  <p className="mt-2 text-sm">{billingHealth.description}</p>
                </div>
                <div className="grid gap-2 text-sm">
                  <HealthLine label="Outstanding invoices" value={overdueInvoices.length} />
                  <HealthLine label="Suspensions" value={suspendedAccounts.length} />
                  <HealthLine label="Renewals in 30 days" value={expiringWithin30.length} />
                </div>
              </div>
            </Panel>
          </MobileAccordionSection>
        </div>
      ) : null}

      {activeTab === "subscriptions" ? (
        <div className="grid gap-4">
          <MobileAccordionSection title="Subscription Management" defaultOpen>
            <Panel title="Subscription Management">
              <AdvancedSubscriptionTable subscriptions={filteredSubscriptions} />
            </Panel>
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
            <Panel title="Revenue Summary Panel">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MiniMetric label="Today Revenue" value={formatMoney(todayRevenue)} />
                <MiniMetric label="This Month Revenue" value={formatMoney(monthlyRevenue)} />
                <MiniMetric label="Last Month Revenue" value={formatMoney(lastMonthRevenue)} />
                <MiniMetric label="Year To Date Revenue" value={formatMoney(ytdRevenue)} />
                <MiniMetric label="Average Revenue Per Business" value={formatMoney(averageRevenuePerBusiness)} />
                <MiniMetric label="Highest Revenue Plan" value={highestRevenuePlan} />
                <MiniMetric label="Lowest Revenue Plan" value={lowestRevenuePlan} />
              </div>
            </Panel>
          </MobileAccordionSection>
          <MobileAccordionSection title="Financial Exports">
            <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F97316]">Financial Exports</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#111827]">Filter-aware billing reports</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ExportButton href={`/platform/billing-center?${buildQuery(params)}&export=csv`} icon={<Download className="h-4 w-4" />} label="CSV" />
                  <ExportButton href={`/platform/billing-center?${buildQuery(params)}&export=excel`} icon={<FileSpreadsheet className="h-4 w-4" />} label="Excel" />
                  <ExportButton href={`/platform/billing-center?${buildQuery(params)}&export=pdf`} icon={<FileText className="h-4 w-4" />} label="PDF" />
                </div>
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

function BillingCenterTabs({ activeTab, params }: { activeTab: BillingTabKey; params: BillingParams }) {
  return (
    <nav className="rounded-md border border-[#E5E7EB] bg-white p-2 shadow-sm" aria-label="Billing Center sections">
      <div className="grid gap-2 sm:grid-cols-4">
        {billingTabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={buildBillingTabHref(params, tab.key)}
              className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
                active ? "bg-[#F97316] text-white" : "text-[#6B7280] hover:bg-orange-50 hover:text-[#F97316]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AdvancedSubscriptionTable({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {subscriptions.map((subscription) => (
          <SubscriptionMobileCard key={subscription.id} subscription={subscription} />
        ))}
        {subscriptions.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] py-8 text-center text-sm text-[#6B7280]">No subscriptions match these filters.</p> : null}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-[#6B7280]">
            {["Business", "Plan", "Billing", "Status", "Start Date", "Expiry Date", "Renewal Date", "Days Remaining", "Monthly Value", "Annual Value", "Trial Status", "Created By", "Actions"].map((heading) => (
              <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => {
            const annual = getAnnualSubscriptionValue(subscription);
            const monthly = annual / 12;
            const remaining = getSubscriptionRemainingDays(subscription);
            return (
              <tr key={subscription.id} className="align-top">
                <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{subscription.business.name}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{subscription.subscriptionPlan.name}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatBillingCycle(subscription.billingCycle)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4"><LifecycleBadge status={deriveLifecycleStatus(subscription)} /></td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(subscription.startDate)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{subscription.expiryDate ? formatDate(subscription.expiryDate) : "-"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{subscription.renewalDate ? formatDate(subscription.renewalDate) : "-"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{remaining === null ? "-" : remaining}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(monthly)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(annual)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{getTrialRemainingDays(subscription) === null ? "Not trial" : `${getTrialRemainingDays(subscription)} days left`}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{subscription.auditLogs[0]?.user?.name ?? "System"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4">
                  <div className="flex flex-wrap gap-2">
                    <ActionLink href={`/platform/businesses/${subscription.business.uuid}`} label="View" />
                    <ActionLink href={`/platform/businesses/${subscription.business.uuid}/edit`} label="Edit" />
                    <ActionLink href="/platform/subscriptions" label="Suspend" />
                    <ActionLink href="/platform/subscriptions" label="Activate" />
                    <ActionLink href="/platform/subscriptions" label="Cancel" />
                    <ActionLink href={`/platform/businesses/${subscription.business.uuid}/edit`} label="Upgrade" />
                    <ActionLink href={`/platform/businesses/${subscription.business.uuid}/edit`} label="Downgrade" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {subscriptions.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No subscriptions match these filters.</p> : null}
      </div>
    </>
  );
}

function SubscriptionMobileCard({ subscription }: { subscription: SubscriptionRow }) {
  const annual = getAnnualSubscriptionValue(subscription);
  const monthly = annual / 12;
  const remaining = getSubscriptionRemainingDays(subscription);
  return (
    <article className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">Subscription</p>
          <h3 className="mt-1 text-base font-semibold text-[#111827]">{subscription.business.name}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{subscription.subscriptionPlan.name} - {formatBillingCycle(subscription.billingCycle)}</p>
        </div>
        <LifecycleBadge status={deriveLifecycleStatus(subscription)} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <BillingMobileLine label="Expiry" value={subscription.expiryDate ? formatDate(subscription.expiryDate) : "-"} />
        <BillingMobileLine label="Renewal" value={subscription.renewalDate ? formatDate(subscription.renewalDate) : "-"} />
        <BillingMobileLine label="Remaining" value={remaining === null ? "-" : `${remaining} day(s)`} />
        <BillingMobileLine label="Monthly Value" value={formatMoney(monthly)} />
        <BillingMobileLine label="Annual Value" value={formatMoney(annual)} />
        <BillingMobileLine label="Trial" value={getTrialRemainingDays(subscription) === null ? "Not trial" : `${getTrialRemainingDays(subscription)} days left`} />
        <BillingMobileLine label="Created By" value={subscription.auditLogs[0]?.user?.name ?? "System"} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionLink href={`/platform/businesses/${subscription.business.uuid}`} label="View" />
        <ActionLink href={`/platform/businesses/${subscription.business.uuid}/edit`} label="Edit" />
        <ActionLink href="/platform/subscriptions" label="Suspend" />
        <ActionLink href="/platform/subscriptions" label="Activate" />
        <ActionLink href="/platform/subscriptions" label="Cancel" />
        <ActionLink href={`/platform/businesses/${subscription.business.uuid}/edit`} label="Upgrade" />
        <ActionLink href={`/platform/businesses/${subscription.business.uuid}/edit`} label="Downgrade" />
      </div>
    </article>
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
    <Panel title="Renewal Center">
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniMetric label="Renewing Today" value={today.length.toString()} />
        <MiniMetric label="Renewing This Week" value={week.length.toString()} />
        <MiniMetric label="Renewing This Month" value={month.length.toString()} />
        <MiniMetric label="Overdue Renewals" value={overdue.length.toString()} />
      </div>
      <div className="mt-4 grid gap-2">
        {month.slice(0, 6).map((subscription) => (
          <BillingActionRow key={subscription.id} title={subscription.business.name} meta={`${subscription.subscriptionPlan.name} - ${subscription.renewalDate ? formatDate(subscription.renewalDate) : "No renewal date"}`} actions={["Send Reminder", "Mark Renewed", "Extend Subscription", "Suspend Account"]} />
        ))}
        {month.length === 0 ? <EmptyText text="No upcoming renewals in this window." /> : null}
      </div>
    </Panel>
  );
}

function TrialManagement({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  return (
    <Panel title="Trial Management">
      <div className="grid gap-3">
        {subscriptions.map((subscription) => (
          <BillingActionRow
            key={subscription.id}
            title={subscription.business.name}
            meta={`Trial: ${subscription.trialStartDate ? formatDate(subscription.trialStartDate) : "-"} to ${subscription.trialEndDate ? formatDate(subscription.trialEndDate) : "-"} - ${getTrialRemainingDays(subscription) ?? 0} days remaining`}
            actions={["Convert To Paid", "Extend Trial", "Cancel Trial"]}
          />
        ))}
        {subscriptions.length === 0 ? <EmptyText text="No trial subscriptions are currently active." /> : null}
      </div>
    </Panel>
  );
}

function PlanPerformance({ plans, subscriptions, payments }: { plans: Awaited<ReturnType<typeof prisma.subscriptionPlan.findMany>>; subscriptions: SubscriptionRow[]; payments: Array<{ amount: Prisma.Decimal; paidAt: Date; invoice: { subscription: { subscriptionPlanId: number; subscriptionPlan: { name: string } } } }> }) {
  const revenueByPlan = calculateRevenueByPlan(payments, plans);
  return (
    <Panel title="Plan Performance">
      <div className="grid gap-4 xl:grid-cols-4">
        {plans.map((plan) => {
          const planSubscriptions = subscriptions.filter((subscription) => subscription.subscriptionPlanId === plan.id);
          const revenue = revenueByPlan.find((item) => item.id === plan.id)?.revenue ?? 0;
          const cancellations = planSubscriptions.filter((subscription) => subscription.status === "CANCELLED").length;
          const renewals = planSubscriptions.filter((subscription) => subscription.renewalDate).length;
          const churnRate = planSubscriptions.length ? Math.round((cancellations / planSubscriptions.length) * 100) : 0;
          const avgDuration = averageDurationDays(planSubscriptions);
          return (
            <article key={plan.id} className="rounded-md border border-[#E5E7EB] p-4">
              <h3 className="font-semibold text-[#111827]">{plan.name}</h3>
              <div className="mt-4 grid gap-2 text-sm">
                <MetricLine label="Businesses" value={new Set(planSubscriptions.map((subscription) => subscription.businessId)).size.toString()} />
                <MetricLine label="Revenue" value={formatMoney(revenue)} />
                <MetricLine label="Renewals" value={renewals.toString()} />
                <MetricLine label="Cancellations" value={cancellations.toString()} />
                <MetricLine label="Churn Rate" value={`${churnRate}%`} />
                <MetricLine label="Average Duration" value={`${avgDuration} days`} />
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function InvoiceStatusDashboard({ invoices }: { invoices: InvoiceRow[] }) {
  const statuses = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"];
  const partiallyPaid = invoices.filter((invoice) => invoice.payments.length > 0 && invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) < Number(invoice.amount)).length;
  return (
    <Panel title="Invoice Management">
      <div className="grid gap-3 sm:grid-cols-2">
        {statuses.map((status) => <MiniMetric key={status} label={status === "OVERDUE" ? "Overdue" : titleCase(status)} value={invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === status).length.toString()} />)}
        <MiniMetric label="Partially Paid" value={partiallyPaid.toString()} />
      </div>
    </Panel>
  );
}

function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <Panel title="Invoice Table">
      <div className="grid gap-3 md:hidden">
        {invoices.slice(0, 20).map((invoice) => (
          <InvoiceMobileCard key={invoice.id} invoice={invoice} />
        ))}
        {invoices.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] py-8 text-center text-sm text-[#6B7280]">No invoices match these filters.</p> : null}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-[#6B7280]">
              {["Invoice Number", "Business", "Plan", "Issue Date", "Due Date", "Amount", "Status", "Payment Date", "Actions"].map((heading) => (
                <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.slice(0, 20).map((invoice) => (
              <tr key={invoice.id}>
                <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{invoice.invoiceNumber}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{invoice.business.name}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{invoice.subscription.subscriptionPlan.name}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(invoice.invoiceDate)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(invoice.dueDate)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(invoice.amount, invoice.currency)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4"><LifecycleBadge status={getInvoiceDisplayStatus(invoice)} /></td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{invoice.payments[0] ? formatDate(invoice.payments[0].paidAt) : "-"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4"><ActionLink href={`/platform/invoices/${invoice.uuid}`} label="View" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function InvoiceMobileCard({ invoice }: { invoice: InvoiceRow }) {
  return (
    <article className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">Invoice</p>
          <h3 className="mt-1 text-base font-semibold text-[#111827]">{invoice.invoiceNumber}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{invoice.business.name}</p>
        </div>
        <LifecycleBadge status={getInvoiceDisplayStatus(invoice)} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <BillingMobileLine label="Plan" value={invoice.subscription.subscriptionPlan.name} />
        <BillingMobileLine label="Issue Date" value={formatDate(invoice.invoiceDate)} />
        <BillingMobileLine label="Due Date" value={formatDate(invoice.dueDate)} />
        <BillingMobileLine label="Amount" value={formatMoney(invoice.amount, invoice.currency)} />
        <BillingMobileLine label="Payment Date" value={invoice.payments[0] ? formatDate(invoice.payments[0].paidAt) : "-"} />
      </div>
      <div className="mt-4">
        <ActionLink href={`/platform/invoices/${invoice.uuid}`} label="View" />
      </div>
    </article>
  );
}

function BillingMobileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-white px-3 py-2">
      <span className="shrink-0 text-[#6B7280]">{label}</span>
      <span className="break-words text-right font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function PaymentTracking({ payments, now, monthStart, yearStart, outstandingRevenue, overdueRevenue }: { payments: Array<{ amount: Prisma.Decimal; paidAt: Date }>; now: Date; monthStart: Date; yearStart: Date; outstandingRevenue: number; overdueRevenue: number }) {
  return (
    <Panel title="Payment Tracking">
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniMetric label="Payments Received Today" value={formatMoney(sumPayments(payments.filter((payment) => isSameUtcDay(payment.paidAt, now))))} />
        <MiniMetric label="This Month" value={formatMoney(sumPayments(payments.filter((payment) => payment.paidAt >= monthStart)))} />
        <MiniMetric label="This Year" value={formatMoney(sumPayments(payments.filter((payment) => payment.paidAt >= yearStart)))} />
        <MiniMetric label="Outstanding Revenue" value={formatMoney(outstandingRevenue)} />
        <MiniMetric label="Overdue Revenue" value={formatMoney(overdueRevenue)} />
        <MiniMetric label="Collected Revenue" value={formatMoney(sumPayments(payments))} />
      </div>
    </Panel>
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
    <Panel title="Churn Analytics">
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniMetric label="Cancelled Accounts" value={cancelled.length.toString()} />
        <MiniMetric label="Suspended Accounts" value={suspended.length.toString()} />
        <MiniMetric label="Failed Renewals" value={failedRenewals.length.toString()} />
        <MiniMetric label="Average Subscription Lifetime" value={`${averageDurationDays(subscriptions)} days`} />
        <MiniMetric label="Most Common Plan Downgrades" value="Not tracked yet" />
        <MiniMetric label="Most Common Cancellation Reasons" value="Not tracked yet" />
      </div>
    </Panel>
  );
}

function BillingAlerts({ subscriptions, invoices, payments, now }: { subscriptions: SubscriptionRow[]; invoices: InvoiceRow[]; payments: Array<{ paidAt: Date; invoice: { business: { name: string }; subscription: { subscriptionPlan: { name: string } } } }>; now: Date }) {
  const alerts = [
    ...subscriptions.filter((subscription) => daysUntil(subscription.expiryDate, now) === 30).map((subscription) => `Subscription expires in 30 days: ${subscription.business.name}`),
    ...subscriptions.filter((subscription) => daysUntil(subscription.expiryDate, now) === 7).map((subscription) => `Subscription expires in 7 days: ${subscription.business.name}`),
    ...invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "OVERDUE").map((invoice) => `Invoice overdue: ${invoice.invoiceNumber}`),
    ...subscriptions.filter((subscription) => subscription.status === "TRIAL" && (getTrialRemainingDays(subscription) ?? 99) <= 7).map((subscription) => `Trial ending soon: ${subscription.business.name}`),
    ...payments.slice(0, 3).map((payment) => `Payment recorded: ${payment.invoice.business.name}`),
  ];
  return (
    <Panel title="Billing Alerts">
      <div className="grid gap-2">
        {alerts.slice(0, 12).map((alert) => (
          <div key={alert} className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-[#C2410C]">{alert}</div>
        ))}
        {alerts.length === 0 ? <EmptyText text="No billing alerts require attention." /> : null}
        <div className="rounded-md border border-dashed border-[#E5E7EB] p-3 text-sm text-[#6B7280]">
          Billing reminders and renewal notices can be managed manually from Subscription Management.
        </div>
      </div>
    </Panel>
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
  if (overdueInvoices > 0 || suspendedAccounts > 0) return { label: "At Risk", description: "Overdue invoices or suspended accounts require immediate attention.", tone: "border-red-200 bg-red-50 text-red-700" };
  if (expiringWithin30 > 0) return { label: "Attention Needed", description: "Upcoming renewals should be reviewed.", tone: "border-orange-200 bg-orange-50 text-[#C2410C]" };
  return { label: "Healthy", description: "No urgent billing issues detected.", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" };
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

function KpiCard({ icon: Icon, label, value, tone = "default" }: { icon: LucideIcon; label: string; value: string; tone?: "default" | "warn" | "danger" }) {
  const toneClass = tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : tone === "warn" ? "border-orange-200 bg-orange-50 text-[#C2410C]" : "border-[#E5E7EB] bg-white text-[#111827]";
  return (
    <div className={`rounded-md border p-3 shadow-sm md:p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function HealthLine({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between rounded-md border border-[#E5E7EB] px-3 py-2"><span>{label}</span><strong>{value}</strong></div>;
}

function Chart({ title, points, money = false }: { title: string; points: ChartPoint[]; money?: boolean }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <h3 className="font-semibold text-[#111827]">{title}</h3>
      <div className="mt-4 flex h-40 items-end gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end rounded-md bg-[#FAFAFA] px-1">
              <div className="w-full rounded-t-md bg-[#F97316]" style={{ height: `${Math.max(6, (point.value / max) * 100)}%` }} />
            </div>
            <p className="text-xs font-semibold text-[#111827]">{money ? formatMoney(point.value) : point.value}</p>
            <p className="text-xs text-[#6B7280]">{point.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Distribution({ title, points, money = false }: { title: string; points: ChartPoint[]; money?: boolean }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <h3 className="font-semibold text-[#111827]">{title}</h3>
      <div className="mt-4 grid gap-3">
        {points.map((point) => {
          const percent = total > 0 ? Math.round((point.value / total) * 100) : 0;
          return (
            <div key={point.label}>
              <div className="flex justify-between text-sm"><span>{point.label}</span><strong>{money ? formatMoney(point.value) : point.value}</strong></div>
              <div className="mt-2 h-2 rounded-full bg-[#F3F4F6]"><div className="h-2 rounded-full bg-[#F97316]" style={{ width: `${percent}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LifecycleBadge({ status }: { status: string }) {
  const classes = status === "ACTIVE" || status === "PAID" ? "bg-emerald-50 text-emerald-700" : status === "TRIAL" || status === "PENDING_RENEWAL" || status === "ISSUED" ? "bg-orange-50 text-orange-700" : status === "EXPIRED" || status === "SUSPENDED" || status === "OVERDUE" ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{titleCase(status)}</span>;
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">{label}</Link>;
}

function BillingActionRow({ title, meta, actions }: { title: string; meta: string; actions: string[] }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="font-semibold text-[#111827]">{title}</p><p className="mt-1 text-sm text-[#6B7280]">{meta}</p></div>
        <div className="flex flex-wrap gap-2">{actions.map((action) => <ActionLink key={action} href="/platform/subscriptions" label={action} />)}</div>
      </div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-[#6B7280]">{label}</span><strong className="text-[#111827]">{value}</strong></div>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">{text}</p>;
}

function ExportButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return <Link href={href} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">{icon}{label}</Link>;
}
