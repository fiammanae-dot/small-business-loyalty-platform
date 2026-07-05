import Link from "next/link";
import { Building2, CreditCard, Package, Search, Sparkles, Star, TrendingUp, X } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  MetricCard,
  ProgressBar,
  SortableHeadCell,
  StatusBadge,
} from "@/components/ui";
import { formatBillingCycle, getBillingCycleSupport, type PlanCycle } from "@/lib/subscription-plans";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

type PlanSearchParams = {
  q?: string;
  sort?: string;
};

type PlanMetric = {
  id: number;
  code: string;
  name: string;
  maxBranches: number;
  maxLoyaltyPrograms: number;
  monthlyPrice: number;
  annualPrice: number;
  cycles: PlanCycle[];
  billingCycles: string[];
  businessesUsingPlan: number;
  activeSubscriptions: number;
  totalRevenue: number;
  adoptionPercent: number;
};

const sortOptions = {
  activeSubscriptions: "Active subscriptions",
  businesses: "Businesses using plan",
  revenue: "Revenue",
  name: "Plan name",
} as const;

function buildPlanSortHref(params: PlanSearchParams, sort: keyof typeof sortOptions) {
  const query = new URLSearchParams();
  if (params.q) {
    query.set("q", params.q);
  }
  query.set("sort", sort);
  return `/platform/plans?${query.toString()}`;
}

function formatMoney(value: number) {
  return `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function getPriceParts(plan: PlanMetric) {
  const perBranch = plan.code === "MULTI_BRANCH";
  const hasMonthly = !perBranch && plan.cycles.includes("MONTHLY");
  const hasYearly = plan.cycles.includes("YEARLY");
  const heroValue = hasMonthly ? plan.monthlyPrice : plan.annualPrice;
  const heroUnit = hasMonthly ? "/ month" : perBranch ? "/ year per branch" : "/ year";
  const subline = hasMonthly && hasYearly ? `or AED ${plan.annualPrice.toFixed(0)} / year` : null;
  const short = hasMonthly
    ? `AED ${plan.monthlyPrice.toFixed(0)}/mo`
    : perBranch
      ? `AED ${plan.annualPrice.toFixed(0)}/yr per branch`
      : `AED ${plan.annualPrice.toFixed(0)}/yr`;

  return { heroValue, heroUnit, subline, short };
}

export default async function PlatformPlansPage({
  searchParams,
}: {
  searchParams: Promise<PlanSearchParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const sort = Object.keys(sortOptions).includes(params.sort ?? "") ? (params.sort as keyof typeof sortOptions) : "activeSubscriptions";
  const [plans, totalBusinesses, activeSubscriptions] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: { maxBranches: "asc" },
      include: {
        subscriptions: {
          include: { business: true },
        },
      },
    }),
    prisma.business.count(),
    prisma.businessSubscription.count({ where: { status: "ACTIVE" } }),
  ]);

  const allPlanMetrics = plans.map((plan): PlanMetric => {
    const businessesUsingPlan = new Set(plan.subscriptions.map((subscription) => subscription.businessId)).size;
    const activePlanSubscriptions = plan.subscriptions.filter((subscription) => subscription.status === "ACTIVE");
    const planActiveSubscriptions = activePlanSubscriptions.length;
    const totalRevenue = activePlanSubscriptions.reduce((sum, subscription) => {
      return sum + Number(subscription.billingCycle === "YEARLY" ? plan.annualPrice : plan.monthlyPrice);
    }, 0);
    const cycles = getBillingCycleSupport(plan);
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      maxBranches: plan.maxBranches,
      maxLoyaltyPrograms: plan.maxLoyaltyPrograms,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: Number(plan.annualPrice),
      cycles,
      billingCycles: cycles.map(formatBillingCycle),
      businessesUsingPlan,
      activeSubscriptions: planActiveSubscriptions,
      totalRevenue,
      adoptionPercent: totalBusinesses > 0 ? Math.round((businessesUsingPlan / totalBusinesses) * 100) : 0,
    };
  });

  const planMetrics = allPlanMetrics
    .filter((plan) => !query || plan.name.toLowerCase().includes(query) || plan.code.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sort === "businesses") return b.businessesUsingPlan - a.businessesUsingPlan || a.name.localeCompare(b.name);
      if (sort === "revenue") return b.totalRevenue - a.totalRevenue || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.activeSubscriptions - a.activeSubscriptions || a.name.localeCompare(b.name);
    });

  const mostPopular = [...allPlanMetrics].sort((a, b) => b.activeSubscriptions - a.activeSubscriptions)[0];
  const popularPlanId = mostPopular && mostPopular.activeSubscriptions > 0 ? mostPopular.id : null;
  const totalPlanRevenue = planMetrics.reduce((sum, plan) => sum + plan.totalRevenue, 0);
  const activeFilterCount = [params.q, params.sort].filter(Boolean).length;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Plans">
      <section className="flex flex-col gap-1">
        <p className="text-sm text-[#7A8091]">Plans differ only by price, branch limit, loyalty program limit, and billing cycle.</p>
      </section>

      <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_240px_auto_auto]">
            <label className="relative">
              <span className="sr-only">Search plan name or code</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8091]" aria-hidden="true" />
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search plan name or code"
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Sort plans</span>
              <select
                name="sort"
                defaultValue={sort}
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              >
                {Object.entries(sortOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    Sort by {label.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href="/platform/plans"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          </div>
        </form>
      </MobileFilterDrawer>

      <PlatformKpiGrid className="gap-3 lg:grid-cols-4">
        <MetricCard icon={<Package />} label="Total Plans" value={plans.length.toString()} helper="In the catalog" />
        <MetricCard icon={<CreditCard />} label="Active Subscriptions" value={activeSubscriptions.toString()} helper="Across all plans" />
        <MetricCard
          icon={<Star />}
          label="Most Popular Plan"
          value={popularPlanId ? mostPopular.name : "—"}
          helper={popularPlanId ? `${mostPopular.activeSubscriptions} of ${activeSubscriptions} active subscriptions` : "No plan usage yet"}
        />
        <MetricCard
          icon={<TrendingUp />}
          label="Recurring Revenue"
          value={formatMoney(totalPlanRevenue)}
          helper={totalPlanRevenue > 0 ? `From ${activeSubscriptions} active subscriptions` : "No revenue recorded yet"}
        />
      </PlatformKpiGrid>

      <section aria-label="Plan catalog" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {planMetrics.map((plan) => (
          <PlanCard key={plan.id} plan={plan} popular={plan.id === popularPlanId} />
        ))}
        {planMetrics.length === 0 ? (
          <EmptyState
            className="md:col-span-2 xl:col-span-3"
            title="No plans match this search."
            description="Clear the search to return to the full subscription catalog."
            action={
              <Link
                href="/platform/plans"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Clear search
              </Link>
            }
          />
        ) : null}
      </section>

      {planMetrics.length > 0 ? (
        <section aria-label="Plan comparison" className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold tracking-tight text-[#171A21]">Plan comparison</h2>
            <p className="text-sm font-semibold text-[#7A8091]">Showing {planMetrics.length} plans</p>
          </div>

          <div className="grid gap-3 md:hidden">
            {planMetrics.map((plan) => (
              <PlanAnalysisCard key={plan.id} plan={plan} popular={plan.id === popularPlanId} />
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable className="min-w-[880px]">
              <DataTableHeader>
                <tr>
                  <SortableHeadCell href={buildPlanSortHref(params, "name")} active={sort === "name"} direction="asc" className="pl-4">Plan</SortableHeadCell>
                  <DataTableHeadCell className="text-right">Branch limit</DataTableHeadCell>
                  <DataTableHeadCell className="text-right">Program limit</DataTableHeadCell>
                  <SortableHeadCell href={buildPlanSortHref(params, "businesses")} active={sort === "businesses"} align="right">Businesses</SortableHeadCell>
                  <SortableHeadCell href={buildPlanSortHref(params, "activeSubscriptions")} active={sort === "activeSubscriptions"} align="right">Active subs</SortableHeadCell>
                  <SortableHeadCell href={buildPlanSortHref(params, "revenue")} active={sort === "revenue"} align="right">Revenue</SortableHeadCell>
                  <DataTableHeadCell className="w-[18%] pr-4">Adoption</DataTableHeadCell>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {planMetrics.map((plan) => {
                  const price = getPriceParts(plan);
                  return (
                    <tr key={plan.id} className="align-middle">
                      <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
                        <p className="font-semibold text-[#171A21]">{plan.name}</p>
                        <p className="mt-0.5 text-xs text-[#7A8091]">
                          {price.short}
                          {plan.code.toLowerCase() !== plan.name.toLowerCase() ? ` · ${plan.code}` : ""}
                        </p>
                      </td>
                      <DataTableCell className="text-right tabular-nums">{plan.maxBranches}</DataTableCell>
                      <DataTableCell className="text-right tabular-nums">{plan.maxLoyaltyPrograms}</DataTableCell>
                      <DataTableCell className="text-right tabular-nums">{plan.businessesUsingPlan}</DataTableCell>
                      <DataTableCell className="text-right font-semibold tabular-nums text-[#171A21]">{plan.activeSubscriptions}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(plan.totalRevenue)}</DataTableCell>
                      <DataTableCell className="pr-4">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={plan.adoptionPercent} className="flex-1" />
                          <span className="text-xs tabular-nums text-[#3D4352]">{plan.adoptionPercent}%</span>
                        </div>
                      </DataTableCell>
                    </tr>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}

function PlanCard({ plan, popular }: { plan: PlanMetric; popular: boolean }) {
  const price = getPriceParts(plan);
  const showCode = plan.code.toLowerCase() !== plan.name.toLowerCase();

  return (
    <article
      className={`grid grid-rows-[auto_auto_1fr_auto] rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(15,18,25,0.04)] ${
        popular ? "border-2 border-[var(--accent)]" : "border border-[var(--medium-gray)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-base font-bold tracking-tight text-[#171A21]">{plan.name}</h3>
          {popular ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--light-orange)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-deep)]">
              <Star className="h-3 w-3" aria-hidden="true" />
              Most popular
            </span>
          ) : null}
          {showCode ? <p className="w-full text-xs font-medium uppercase tracking-wide text-[#9AA0AD]">{plan.code}</p> : null}
        </div>
        <StatusBadge tone={popular ? "brand" : "neutral"}>{plan.activeSubscriptions} active</StatusBadge>
      </div>

      <div className="mt-4">
        <p>
          <span className="text-2xl font-bold tracking-tight tabular-nums text-[#171A21]">AED {price.heroValue.toFixed(0)}</span>
          <span className="text-sm text-[#7A8091]"> {price.heroUnit}</span>
        </p>
        {price.subline ? <p className="mt-0.5 text-xs text-[#7A8091]">{price.subline}</p> : null}
      </div>

      <div className="mt-4 grid content-start gap-2 border-t border-[var(--medium-gray)] pt-4 text-sm text-[#3D4352]">
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--accent-deep)]" aria-hidden="true" />
          Up to {plan.maxBranches} {plan.maxBranches === 1 ? "branch" : "branches"}
        </span>
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent-deep)]" aria-hidden="true" />
          Up to {plan.maxLoyaltyPrograms} {plan.maxLoyaltyPrograms === 1 ? "loyalty program" : "loyalty programs"}
        </span>
      </div>

      <div className="mt-4 border-t border-[var(--medium-gray)] pt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[#7A8091]">
            {plan.businessesUsingPlan} {plan.businessesUsingPlan === 1 ? "business" : "businesses"} on this plan
          </span>
          <span className="font-semibold tabular-nums text-[#171A21]">{plan.adoptionPercent}%</span>
        </div>
        <ProgressBar value={plan.adoptionPercent} className="mt-2" />
        <p className="mt-1.5 text-xs text-[#7A8091]">Adoption across all businesses</p>
      </div>
    </article>
  );
}

function PlanAnalysisCard({ plan, popular }: { plan: PlanMetric; popular: boolean }) {
  const price = getPriceParts(plan);

  return (
    <article className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 font-semibold text-[#171A21]">
          {plan.name} <span className="text-xs font-normal text-[#7A8091]">{price.short}</span>
        </p>
        <StatusBadge tone={popular ? "brand" : "neutral"}>{plan.activeSubscriptions} active</StatusBadge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <AnalysisRow label="Branch limit" value={plan.maxBranches.toString()} />
        <AnalysisRow label="Program limit" value={plan.maxLoyaltyPrograms.toString()} />
        <AnalysisRow label="Businesses" value={plan.businessesUsingPlan.toString()} />
        <AnalysisRow label="Revenue" value={formatMoney(plan.totalRevenue)} />
        <AnalysisRow label="Billing" value={plan.billingCycles.join(", ")} />
        <AnalysisRow label="Adoption" value={`${plan.adoptionPercent}%`} />
      </dl>
      <ProgressBar value={plan.adoptionPercent} className="mt-3" />
    </article>
  );
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[#7A8091]">{label}</dt>
      <dd className="text-right font-semibold text-[#171A21]">{value}</dd>
    </div>
  );
}
