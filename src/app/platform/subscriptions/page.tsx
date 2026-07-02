import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, MetricCard } from "@/components/ui";
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
      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <Message error={params.error} success={params.success} />
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Business subscriptions</h2>
            <p className="mt-1 text-sm text-[#6B7280]">View lifecycle status, expiry, renewal, and audit activity.</p>
          </div>

          <MobileFilterDrawer activeCount={activeFilterCount}>
          <form className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center xl:justify-end">
            <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827]">
              <option value="">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item.toLowerCase()}
                </option>
              ))}
            </select>
            <div className="min-w-52">
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
            </div>
            <select name="expiry" defaultValue={params.expiry ?? ""} className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827]">
              <option value="">All expiry dates</option>
              <option value="next30">Expiring in 30 days</option>
              <option value="expired">Expired</option>
            </select>
            <button type="submit" className="h-9 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white hover:bg-orange-600">
              Apply filters
            </button>
            <Link
              href="/platform/subscriptions"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]"
            >
              <RotateCcw className="h-4 w-4" />
              Clear filters
            </Link>
          </form>
          </MobileFilterDrawer>
        </div>
      </section>

      <PlatformKpiGrid className="md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Subscriptions" value={activeSubscriptionCount.toString()} href="/platform/subscriptions?status=ACTIVE" />
        <MetricCard label="Trial Subscriptions" value={trialSubscriptionCount.toString()} href="/platform/subscriptions?status=TRIAL" tone="warning" />
        <MetricCard label="Expiring Within 30 Days" value={expiringWithin30DaysCount.toString()} href="/platform/subscriptions?expiry=next30" tone="info" />
        <MetricCard label="Suspended Subscriptions" value={suspendedSubscriptionCount.toString()} href="/platform/subscriptions?status=SUSPENDED" tone={suspendedSubscriptionCount > 0 ? "danger" : "neutral"} />
      </PlatformKpiGrid>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#111827]">Showing {subscriptions.length} subscriptions</p>
          <p className="text-xs text-[#6B7280]">Open a business to review details and manage subscription lifecycle actions.</p>
        </div>

        <div className="hidden lg:block">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Business", "Plan", "Status", "Expiry Date", "Days Remaining", ""].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-2 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <SubscriptionRow key={subscription.id} subscription={subscription} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 lg:hidden">
          {subscriptions.map((subscription) => (
            <SubscriptionCard key={subscription.id} subscription={subscription} />
          ))}
        </div>

        {subscriptions.length === 0 ? <EmptyState title="No subscriptions match these filters." description="Clear filters or adjust the subscription criteria to review more records." /> : null}
      </section>
    </DashboardShell>
  );
}

function SubscriptionRow({ subscription }: { subscription: SubscriptionWithListData }) {
  const remainingDays = getSubscriptionRemainingDays(subscription);

  return (
    <tr className="group align-middle transition hover:bg-[#FFF7ED]">
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/platform/businesses/${subscription.business.uuid}`}
            className="inline-flex min-w-0 items-center gap-1 truncate font-semibold text-[#111827] transition hover:text-[#F97316] hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] group-hover:text-[#F97316]"
          >
            <span className="truncate">{subscription.business.name}</span>
          </Link>
          <div className="flex flex-wrap gap-1">
            <CompactBadge label={subscription.business.status === "ACTIVE" ? "Business active" : "Business inactive"} tone={subscription.business.status === "ACTIVE" ? "green" : "gray"} />
            {isSuspiciousBusinessName(subscription.business.name) ? <CompactBadge label="Review flagged" tone="orange" /> : null}
          </div>
        </div>
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{subscription.subscriptionPlan.name}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <StatusBadge status={subscription.status} />
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{subscription.expiryDate ? formatDate(subscription.expiryDate) : "-"}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{remainingDays === null ? "-" : `${remainingDays} day(s)`}</td>
      <td className="w-10 border-b border-[#E5E7EB] px-3 py-3 text-right text-[#9CA3AF]">
        <ChevronRight className="ml-auto h-4 w-4 transition group-hover:text-[#F97316]" aria-hidden="true" />
      </td>
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
      className="group block rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:border-[#F97316] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
      aria-label={`Open ${subscription.business.name} subscription details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1 break-words font-semibold text-[#111827] transition group-hover:text-[#F97316] group-hover:underline">
            {subscription.business.name}
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">{subscription.subscriptionPlan.name} - {formatBillingCycle(subscription.billingCycle)}</p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <CompactBadge label={subscription.business.status === "ACTIVE" ? "Business active" : "Business inactive"} tone={subscription.business.status === "ACTIVE" ? "green" : "gray"} />
        {isSuspiciousBusinessName(subscription.business.name) ? <CompactBadge label="Review flagged" tone="orange" /> : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Trial" value={trialDays === null ? "-" : `${trialDays} day(s) left`} />
        <Detail label="Expiry" value={subscription.expiryDate ? formatDate(subscription.expiryDate) : "-"} />
        <Detail label="Renewal" value={subscription.renewalDate ? formatDate(subscription.renewalDate) : "-"} />
        <Detail label="Remaining" value={remainingDays === null ? "-" : `${remainingDays} day(s)`} />
      </dl>

      {lastAudit ? (
        <p className="mt-3 text-xs text-[#6B7280]">
          Last audit: <span className="font-medium text-[#111827]">{lastAudit.action.replaceAll("_", " ").toLowerCase()}</span> on {formatDateTime(lastAudit.createdAt)}
        </p>
      ) : null}
    </Link>
  );
}
function CompactBadge({ label, tone }: { label: string; tone: "green" | "gray" | "orange" }) {
  const classes = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    gray: "border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]",
    orange: "border-orange-200 bg-orange-50 text-[#C2410C]",
  };

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${classes[tone]}`}>{label}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <dt className="text-xs font-semibold uppercase text-[#6B7280]">{label}</dt>
      <dd className="mt-1 font-semibold text-[#111827]">{value}</dd>
    </div>
  );
}

function isSuspiciousBusinessName(name: string) {
  return suspiciousBusinessNamePattern.test(name);
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <p className={`mb-4 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      {error ?? success}
    </p>
  );
}

