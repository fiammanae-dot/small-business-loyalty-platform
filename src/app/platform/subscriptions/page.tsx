import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { ChevronDown, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatBillingCycle, formatPlanPrice } from "@/lib/subscription-plans";
import { getSubscriptionRemainingDays, getTrialRemainingDays } from "@/lib/subscriptions";
import { extendSubscriptionAction, startTrialAction, updateSubscriptionStatusAction } from "@/app/platform/subscriptions/actions";

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

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#111827]">Showing {subscriptions.length} subscriptions</p>
          <p className="text-xs text-[#6B7280]">Use More for lifecycle actions, trial setup, and extensions.</p>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Business", "Plan", "Billing", "Status", "Trial", "Expiry", "Renewal", "Remaining", "Last audit", "Actions"].map((heading) => (
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

        {subscriptions.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No subscriptions match these filters.</p> : null}
      </section>
    </DashboardShell>
  );
}

function SubscriptionRow({ subscription }: { subscription: SubscriptionWithListData }) {
  const lastAudit = subscription.auditLogs[0];
  const remainingDays = getSubscriptionRemainingDays(subscription);
  const trialDays = getTrialRemainingDays(subscription);

  return (
    <tr className="align-middle">
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <div className="flex flex-col gap-1">
          <Link href={`/platform/businesses/${subscription.business.uuid}`} className="font-semibold text-[#111827] hover:text-[#F97316]">
            {subscription.business.name}
          </Link>
          <div className="flex flex-wrap gap-1">
            <CompactBadge label={subscription.business.status === "ACTIVE" ? "Business active" : "Business inactive"} tone={subscription.business.status === "ACTIVE" ? "green" : "gray"} />
            {isSuspiciousBusinessName(subscription.business.name) ? <CompactBadge label="Test/Demo Data" tone="orange" /> : null}
          </div>
        </div>
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{subscription.subscriptionPlan.name}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{formatBillingCycle(subscription.billingCycle)}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <StatusBadge status={subscription.status} />
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">
        <CompactDateRange start={subscription.trialStartDate} end={subscription.trialEndDate} />
        {trialDays === null ? null : <p className="mt-1 text-xs">{trialDays} day(s) left</p>}
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{subscription.expiryDate ? formatDate(subscription.expiryDate) : "-"}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{subscription.renewalDate ? formatDate(subscription.renewalDate) : "-"}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{remainingDays === null ? "-" : `${remainingDays} day(s)`}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">
        {lastAudit ? (
          <div className="max-w-[180px]">
            <p className="truncate font-medium text-[#111827]">{lastAudit.action.replaceAll("_", " ").toLowerCase()}</p>
            <p className="mt-0.5 text-xs">{formatDateTime(lastAudit.createdAt)}</p>
          </div>
        ) : (
          "-"
        )}
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <SubscriptionActions subscriptionId={subscription.id} businessUuid={subscription.business.uuid} />
      </td>
    </tr>
  );
}

function SubscriptionCard({ subscription }: { subscription: SubscriptionWithListData }) {
  const lastAudit = subscription.auditLogs[0];
  const remainingDays = getSubscriptionRemainingDays(subscription);
  const trialDays = getTrialRemainingDays(subscription);

  return (
    <article className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/platform/businesses/${subscription.business.uuid}`} className="font-semibold text-[#111827] hover:text-[#F97316]">
            {subscription.business.name}
          </Link>
          <p className="mt-1 text-sm text-[#6B7280]">{subscription.subscriptionPlan.name} · {formatBillingCycle(subscription.billingCycle)}</p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <CompactBadge label={subscription.business.status === "ACTIVE" ? "Business active" : "Business inactive"} tone={subscription.business.status === "ACTIVE" ? "green" : "gray"} />
        {isSuspiciousBusinessName(subscription.business.name) ? <CompactBadge label="Test/Demo Data" tone="orange" /> : null}
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

      <div className="mt-4">
        <SubscriptionActions subscriptionId={subscription.id} businessUuid={subscription.business.uuid} />
      </div>
    </article>
  );
}

function SubscriptionActions({ subscriptionId, businessUuid }: { subscriptionId: number; businessUuid: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Link
        href={`/platform/businesses/${businessUuid}`}
        className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#111827] px-3 text-xs font-semibold text-white hover:bg-[#374151]"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Manage
      </Link>
      <details className="group min-w-fit">
        <summary className="inline-flex h-8 cursor-pointer list-none items-center justify-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-xs font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
          More
          <ChevronDown className="h-3.5 w-3.5" />
        </summary>
        <div className="mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-[#E5E7EB] bg-white p-3 shadow-lg">
          <div className="grid gap-2">
            <ActionButton subscriptionId={subscriptionId} nextStatus="ACTIVE" label="Activate" />
            <ActionButton subscriptionId={subscriptionId} nextStatus="SUSPENDED" label="Suspend" />
            <ActionButton subscriptionId={subscriptionId} nextStatus="CANCELLED" label="Cancel" />
            <form action={startTrialAction} className="rounded-md border border-[#E5E7EB] p-2">
              <CsrfInput scope="platform:subscriptions" />
              <input type="hidden" name="subscriptionId" value={subscriptionId} />
              <label className="text-xs font-semibold text-[#111827]">
                Start Trial
                <div className="mt-2 flex gap-2">
                  <input name="days" type="number" min="1" max="365" defaultValue="14" className="h-8 w-20 rounded-md border border-[#E5E7EB] px-2 text-sm" />
                  <button type="submit" className="h-8 flex-1 rounded-md border border-[#F97316] px-3 text-xs font-semibold text-[#F97316] hover:bg-orange-50">
                    Apply
                  </button>
                </div>
              </label>
            </form>
            <form action={extendSubscriptionAction} className="rounded-md border border-[#E5E7EB] p-2">
              <CsrfInput scope="platform:subscriptions" />
              <input type="hidden" name="subscriptionId" value={subscriptionId} />
              <label className="text-xs font-semibold text-[#111827]">
                Extend
                <div className="mt-2 flex gap-2">
                  <input name="days" type="number" min="1" max="3650" defaultValue="30" className="h-8 w-20 rounded-md border border-[#E5E7EB] px-2 text-sm" />
                  <button type="submit" className="h-8 flex-1 rounded-md bg-[#F97316] px-3 text-xs font-semibold text-white hover:bg-orange-600">
                    Apply
                  </button>
                </div>
              </label>
            </form>
          </div>
        </div>
      </details>
    </div>
  );
}

function ActionButton({ subscriptionId, nextStatus, label }: { subscriptionId: number; nextStatus: SubscriptionStatus; label: string }) {
  return (
    <form action={updateSubscriptionStatusAction}>
      <CsrfInput scope="platform:subscriptions" />
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <input type="hidden" name="nextStatus" value={nextStatus} />
      <button type="submit" className="h-8 w-full rounded-md border border-[#E5E7EB] px-3 text-xs font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
        {label}
      </button>
    </form>
  );
}

function CompactDateRange({ start, end }: { start: Date | null; end: Date | null }) {
  if (!start) {
    return <>-</>;
  }

  return (
    <>
      {formatDate(start)}
      <span className="mx-1 text-[#9CA3AF]">to</span>
      {end ? formatDate(end) : "open"}
    </>
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
