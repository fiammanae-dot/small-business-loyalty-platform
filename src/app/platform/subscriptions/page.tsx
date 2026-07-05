import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  MetricCard,
  StatusBadge as ToneBadge,
} from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatBillingCycle, formatPlanPrice } from "@/lib/subscription-plans";
import { getSubscriptionRemainingDays, getTrialRemainingDays } from "@/lib/subscriptions";

const statuses = ["TRIAL", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"] as const;
const suspiciousBusinessNamePattern = /(demo|test|phase|debug|updated|\d{10,})/i;

type SubscriptionParams = {
  status?: string;
  plan?: string;
  expiry?: string;
  error?: string;
  success?: string;
};

type SubscriptionWithListData = Prisma.BusinessSubscriptionGetPayload<{
  include: {
    business: { select: { uuid: true; name: true; status: true } };
    subscriptionPlan: true;
    auditLogs: {
      include: { user: { select: { name: true; email: true } } };
    };
  };
}>;

export default async function PlatformSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SubscriptionParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const status = statuses.includes(params.status as (typeof statuses)[number]) ? (params.status as SubscriptionStatus) : undefined;
  const planId = params.plan ? Number(params.plan) : undefined;
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(now.getDate() + 30);

  const [plans, subscriptions] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { maxBranches: "asc" } }),
    prisma.businessSubscription.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(planId ? { subscriptionPlanId: planId } : {}),
        ...(params.expiry === "next30" ? { expiryDate: { gte: now, lte: in30Days } } : {}),
        ...(params.expiry === "expired" ? { OR: [{ status: "EXPIRED" }, { expiryDate: { lt: now } }] } : {}),
      },
      include: {
        business: { select: { uuid: true, name: true, status: true } },
        subscriptionPlan: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
    }),
  ]);
  const activeFilterCount = [params.status, params.plan, params.expiry].filter(Boolean).length;
  const activeSubscriptionCount = subscriptions.filter((subscription) => subscription.status === "ACTIVE").length;
  const trialSubscriptionCount = subscriptions.filter((subscription) => subscription.status === "TRIAL").length;
  const suspendedSubscriptionCount = subscriptions.filter((subscription) => subscription.status === "SUSPENDED").length;
  const expiringWithin30DaysCount = subscriptions.filter((subscription) => {
    const remainingDays = getSubscriptionRemainingDays(subscription);
    return remainingDays !== null && remainingDays >= 0 && remainingDays <= 30;
  }).length;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Subscription management">
      <section className="flex flex-col gap-3">
        <Message error={params.error} success={params.success} />
        <p className="text-sm text-[#7A8091]">View lifecycle status, expiry, renewal, and audit activity.</p>
      </section>

      <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-[minmax(150px,1fr)_minmax(200px,1.2fr)_minmax(160px,1fr)_auto_auto] lg:items-end">
            <label>
              <span className="sr-only">Filter by subscription status</span>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm capitalize text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              >
                <option value="">All statuses</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item.toLowerCase()}
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
                { value: "", label: "All plans", description: "Show every subscription plan" },
                ...plans.map((plan) => ({ value: plan.id.toString(), label: plan.name, description: formatPlanPrice(plan) })),
              ]}
            />
            <label>
              <span className="sr-only">Filter by expiry date</span>
              <select
                name="expiry"
                defaultValue={params.expiry ?? ""}
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              >
                <option value="">All expiry dates</option>
                <option value="next30">Expiring in 30 days</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href="/platform/subscriptions"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          </div>
        </form>
      </MobileFilterDrawer>

      <PlatformKpiGrid className="gap-3 lg:grid-cols-4">
        <MetricCard label="Active Subscriptions" value={activeSubscriptionCount.toString()} href="/platform/subscriptions?status=ACTIVE" />
        <MetricCard label="Trial Subscriptions" value={trialSubscriptionCount.toString()} href="/platform/subscriptions?status=TRIAL" tone="warning" />
        <MetricCard label="Expiring Within 30 Days" value={expiringWithin30DaysCount.toString()} href="/platform/subscriptions?expiry=next30" tone="info" />
        <MetricCard label="Suspended Subscriptions" value={suspendedSubscriptionCount.toString()} href="/platform/subscriptions?status=SUSPENDED" tone={suspendedSubscriptionCount > 0 ? "danger" : "neutral"} />
      </PlatformKpiGrid>

      <section aria-label="Subscription results" className="grid gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#171A21]">Showing {subscriptions.length} subscriptions</p>
          <p className="text-xs text-[#7A8091]">Open a business to review details and manage subscription lifecycle actions.</p>
        </div>

        <div className="hidden lg:block">
          <DataTable className="min-w-[960px] table-fixed">
            <DataTableHeader>
              <tr>
                <DataTableHeadCell className="w-[26%] pl-4">Business</DataTableHeadCell>
                <DataTableHeadCell>Plan</DataTableHeadCell>
                <DataTableHeadCell className="w-[11%]">Status</DataTableHeadCell>
                <DataTableHeadCell>Expiry</DataTableHeadCell>
                <DataTableHeadCell>Remaining</DataTableHeadCell>
                <DataTableHeadCell className="w-[19%]">Last audit</DataTableHeadCell>
                <DataTableHeadCell className="w-10 pr-4">
                  <span className="sr-only">Open business</span>
                </DataTableHeadCell>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {subscriptions.map((subscription) => (
                <SubscriptionRow key={subscription.id} subscription={subscription} />
              ))}
            </DataTableBody>
          </DataTable>
        </div>

        <div className="grid gap-3 lg:hidden">
          {subscriptions.map((subscription) => (
            <SubscriptionCard key={subscription.id} subscription={subscription} />
          ))}
        </div>

        {subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions match these filters."
            description="Clear filters or adjust the subscription criteria to review more records."
            action={
              <Link
                href="/platform/subscriptions"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </Link>
            }
          />
        ) : null}
      </section>
    </DashboardShell>
  );
}

function formatDays(days: number) {
  return `${days} ${days === 1 || days === -1 ? "day" : "days"}`;
}

function RemainingDays({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="text-[#7A8091]">—</span>;
  }

  const className = days <= 7 ? "font-semibold text-[#B91C1C]" : days <= 30 ? "font-semibold text-[#B25E09]" : "text-[#3D4352]";
  return <span className={`tabular-nums ${className}`}>{formatDays(days)}</span>;
}

function BusinessBadges({ subscription }: { subscription: SubscriptionWithListData }) {
  return (
    <div className="flex flex-wrap gap-1">
      <ToneBadge tone={subscription.business.status === "ACTIVE" ? "success" : "neutral"} className="px-2 py-0.5 text-[11px]">
        {subscription.business.status === "ACTIVE" ? "Business active" : "Business inactive"}
      </ToneBadge>
      {isSuspiciousBusinessName(subscription.business.name) ? (
        <ToneBadge tone="warning" className="px-2 py-0.5 text-[11px]">
          Review flagged
        </ToneBadge>
      ) : null}
    </div>
  );
}

function SubscriptionRow({ subscription }: { subscription: SubscriptionWithListData }) {
  const remainingDays = getSubscriptionRemainingDays(subscription);
  const trialDays = getTrialRemainingDays(subscription);
  const lastAudit = subscription.auditLogs[0];

  return (
    <tr className="group align-middle">
      <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/platform/businesses/${subscription.business.uuid}`}
            className="inline-flex min-w-0 items-center gap-1 truncate font-semibold text-[#171A21] transition hover:text-[var(--accent-deep)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 group-hover:text-[var(--accent-deep)]"
          >
            <span className="truncate">{subscription.business.name}</span>
          </Link>
          <BusinessBadges subscription={subscription} />
        </div>
      </td>
      <DataTableCell>
        <p className="font-medium text-[#3D4352]">{subscription.subscriptionPlan.name}</p>
        <p className="mt-0.5 text-xs text-[#7A8091]">{formatBillingCycle(subscription.billingCycle)}</p>
      </DataTableCell>
      <DataTableCell>
        <StatusBadge status={subscription.status} />
      </DataTableCell>
      <DataTableCell>
        <p>{subscription.expiryDate ? formatDate(subscription.expiryDate) : "—"}</p>
        {subscription.renewalDate ? <p className="mt-0.5 text-xs text-[#7A8091]">Renews {formatDate(subscription.renewalDate)}</p> : null}
      </DataTableCell>
      <DataTableCell>
        <RemainingDays days={remainingDays} />
        {trialDays !== null ? <p className="mt-0.5 text-xs text-[#7A8091]">Trial: {formatDays(trialDays)} left</p> : null}
      </DataTableCell>
      <DataTableCell>
        {lastAudit ? (
          <>
            <p className="truncate text-xs font-medium capitalize text-[#3D4352]">{lastAudit.action.replaceAll("_", " ").toLowerCase()}</p>
            <p className="mt-0.5 text-xs text-[#7A8091]">{formatDateTime(lastAudit.createdAt)}</p>
          </>
        ) : (
          <span className="text-xs text-[#7A8091]">—</span>
        )}
      </DataTableCell>
      <DataTableCell className="w-10 pr-4 text-right text-[#9AA0AD]">
        <ChevronRight className="ml-auto h-4 w-4 transition group-hover:text-[var(--accent-deep)]" aria-hidden="true" />
      </DataTableCell>
    </tr>
  );
}

function SubscriptionCard({ subscription }: { subscription: SubscriptionWithListData }) {
  const lastAudit = subscription.auditLogs[0];
  const remainingDays = getSubscriptionRemainingDays(subscription);
  const trialDays = getTrialRemainingDays(subscription);

  return (
    <Link
      href={`/platform/businesses/${subscription.business.uuid}`}
      className="group block rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition hover:border-[var(--light-orange)] hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      aria-label={`Open ${subscription.business.name} subscription details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1 break-words font-semibold text-[#171A21] transition group-hover:text-[var(--accent-deep)]">
            {subscription.business.name}
            <ChevronRight className="h-4 w-4 shrink-0 text-[#7A8091] transition group-hover:text-[var(--accent-deep)]" aria-hidden="true" />
          </p>
          <p className="mt-1 text-sm text-[#7A8091]">
            {subscription.subscriptionPlan.name} · {formatBillingCycle(subscription.billingCycle)}
          </p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="mt-2.5">
        <BusinessBadges subscription={subscription} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Expiry</dt>
          <dd className="text-right font-semibold text-[#171A21]">{subscription.expiryDate ? formatDate(subscription.expiryDate) : "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Remaining</dt>
          <dd className="text-right font-semibold">
            <RemainingDays days={remainingDays} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Renewal</dt>
          <dd className="text-right font-semibold text-[#171A21]">{subscription.renewalDate ? formatDate(subscription.renewalDate) : "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Trial</dt>
          <dd className="text-right font-semibold text-[#171A21]">{trialDays === null ? "—" : `${formatDays(trialDays)} left`}</dd>
        </div>
      </dl>

      {lastAudit ? (
        <p className="mt-3 border-t border-[var(--medium-gray)] pt-2.5 text-xs text-[#7A8091]">
          Last audit: <span className="font-medium capitalize text-[#171A21]">{lastAudit.action.replaceAll("_", " ").toLowerCase()}</span> ·{" "}
          {formatDateTime(lastAudit.createdAt)}
        </p>
      ) : null}
    </Link>
  );
}

function isSuspiciousBusinessName(name: string) {
  return suspiciousBusinessNamePattern.test(name);
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
