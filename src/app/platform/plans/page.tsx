import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, GitBranch, Package, Search, Star, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { formatBillingCycle, formatPlanPrice, getBillingCycleSupport } from "@/lib/subscription-plans";
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
  billingCycles: string[];
  businessesUsingPlan: number;
  activeSubscriptions: number;
  totalRevenue: number;
  adoptionPercent: number;
};

export default async function PlatformPlansPage({
  searchParams,
}: {
  searchParams: Promise<PlanSearchParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "activeSubscriptions";
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

  const planMetrics = plans
    .map((plan): PlanMetric => {
      const businessesUsingPlan = new Set(plan.subscriptions.map((subscription) => subscription.businessId)).size;
      const activePlanSubscriptions = plan.subscriptions.filter((subscription) => subscription.status === "ACTIVE");
      const planActiveSubscriptions = activePlanSubscriptions.length;
      const totalRevenue = activePlanSubscriptions.reduce((sum, subscription) => {
        return sum + Number(subscription.billingCycle === "YEARLY" ? plan.annualPrice : plan.monthlyPrice);
      }, 0);
      return {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        maxBranches: plan.maxBranches,
        maxLoyaltyPrograms: plan.maxLoyaltyPrograms,
        monthlyPrice: Number(plan.monthlyPrice),
        annualPrice: Number(plan.annualPrice),
        billingCycles: getBillingCycleSupport(plan).map(formatBillingCycle),
        businessesUsingPlan,
        activeSubscriptions: planActiveSubscriptions,
        totalRevenue,
        adoptionPercent: totalBusinesses > 0 ? Math.round((businessesUsingPlan / totalBusinesses) * 100) : 0,
      };
    })
    .filter((plan) => !query || plan.name.toLowerCase().includes(query) || plan.code.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sort === "businesses") return b.businessesUsingPlan - a.businessesUsingPlan || a.name.localeCompare(b.name);
      if (sort === "revenue") return b.totalRevenue - a.totalRevenue || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.activeSubscriptions - a.activeSubscriptions || a.name.localeCompare(b.name);
    });

  const mostPopularPlan = [...planMetrics].sort((a, b) => b.activeSubscriptions - a.activeSubscriptions)[0]?.name ?? "No plan usage yet";
  const totalPlanRevenue = planMetrics.reduce((sum, plan) => sum + plan.totalRevenue, 0);
  const activeFilterCount = [params.q, params.sort].filter(Boolean).length;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Plans">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Subscription catalog</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Plan performance</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Plans differ only by price, branch limit, loyalty program limit, and billing cycle.</p>
          </div>
          <div className="lg:min-w-[560px]">
            <MobileFilterDrawer activeCount={activeFilterCount}>
              <form className="grid gap-2 sm:grid-cols-[1fr_220px_auto_auto]">
                <label className="relative">
                  <span className="sr-only">Search plan name</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" aria-hidden="true" />
                  <input
                    name="q"
                    defaultValue={params.q ?? ""}
                    placeholder="Search plan name or code"
                    className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
                  />
                </label>
                <select name="sort" defaultValue={sort} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
                  <option value="activeSubscriptions">Sort by active subscriptions</option>
                  <option value="businesses">Sort by businesses using plan</option>
                  <option value="revenue">Sort by revenue</option>
                  <option value="name">Sort by plan name</option>
                </select>
                <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">Apply</button>
                <Link href="/platform/plans" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">
                  Clear
                </Link>
              </form>
            </MobileFilterDrawer>
          </div>
        </div>

        <PlatformKpiGrid className="mt-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<Package className="h-5 w-5" />} label="Total Plans" value={plans.length.toString()} />
          <KpiCard icon={<CreditCard className="h-5 w-5" />} label="Active Subscriptions" value={activeSubscriptions.toString()} />
          <KpiCard icon={<Star className="h-5 w-5" />} label="Most Popular Plan" value={mostPopularPlan} />
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Total Revenue" value={totalPlanRevenue > 0 ? `AED ${totalPlanRevenue.toFixed(2)}` : "No revenue recorded yet"} />
        </PlatformKpiGrid>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {planMetrics.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
        {planMetrics.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#E5E7EB] bg-white p-6 text-center">
            <p className="text-sm font-semibold text-[#111827]">No plans match this search.</p>
            <p className="mt-2 text-sm text-[#6B7280]">Clear the search to return to the full subscription catalog.</p>
            <Link href="/platform/plans" className="mt-4 inline-flex rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">Clear Search</Link>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Detailed Analysis</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111827]">Plan comparison table</h2>
          </div>
          <p className="text-sm font-semibold text-[#6B7280]">Showing {planMetrics.length} plans</p>
        </div>
        <div className="mt-5 grid gap-3 md:hidden">
          {planMetrics.map((plan) => (
            <PlanAnalysisCard key={plan.id} plan={plan} />
          ))}
          {planMetrics.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">No plan analysis available.</p> : null}
        </div>
        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Plan", "Code", "Billing Cycles", "Max Branches", "Max Loyalty Programs", "Businesses", "Active Subscriptions", "Total Revenue", "Utilization"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planMetrics.map((plan) => (
                <tr key={plan.id} className="align-top">
                  <td className="border-b border-[#E5E7EB] px-3 py-4">
                    <p className="font-semibold text-[#111827]">{plan.name}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">{formatPlanPrice(plan)}</p>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{plan.code}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{plan.billingCycles.join(", ")}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{plan.maxBranches}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{plan.maxLoyaltyPrograms}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{plan.businessesUsingPlan}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{plan.activeSubscriptions}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">AED {plan.totalRevenue.toFixed(2)}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4">
                    <UtilizationBar percent={plan.adoptionPercent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}

function KpiCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-3 md:p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
          <p className={`mt-1 truncate font-semibold text-[#111827] ${value.length > 14 ? "text-base" : "text-2xl"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanMetric }) {
  return (
    <article className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-[#111827]">{plan.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{plan.code}</p>
          </div>
        </div>
        <span className="inline-flex rounded-md bg-orange-50 px-3 py-2 text-xs font-semibold text-[#F97316]">
          {plan.activeSubscriptions} active
        </span>
      </div>

      <p className="mt-5 text-sm font-semibold text-[#111827]">{formatPlanPrice(plan)}</p>
      <p className="mt-1 text-xs text-[#6B7280]">Billing: {plan.billingCycles.join(", ")}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <PlanStat label="Businesses" value={plan.businessesUsingPlan.toString()} />
        <PlanStat label="Branches" value={plan.maxBranches.toString()} />
        <PlanStat label="Programs" value={plan.maxLoyaltyPrograms.toString()} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#111827]">Utilization</p>
          <p className="text-sm font-semibold text-[#F97316]">{plan.adoptionPercent}%</p>
        </div>
        <UtilizationBar percent={plan.adoptionPercent} />
      </div>
    </article>
  );
}

function PlanAnalysisCard({ plan }: { plan: PlanMetric }) {
  return (
    <article className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#111827]">{plan.name}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{plan.code}</p>
        </div>
        <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-[#F97316]">{plan.activeSubscriptions} active</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <PlanAnalysisRow label="Billing Cycles" value={plan.billingCycles.join(", ")} />
        <PlanAnalysisRow label="Max Branches" value={plan.maxBranches.toString()} />
        <PlanAnalysisRow label="Max Programs" value={plan.maxLoyaltyPrograms.toString()} />
        <PlanAnalysisRow label="Businesses" value={plan.businessesUsingPlan.toString()} />
        <PlanAnalysisRow label="Active Subscriptions" value={plan.activeSubscriptions.toString()} />
        <PlanAnalysisRow label="Total Revenue" value={`AED ${plan.totalRevenue.toFixed(2)}`} />
      </div>
      <div className="mt-4">
        <UtilizationBar percent={plan.adoptionPercent} />
      </div>
    </article>
  );
}

function PlanAnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
      <span className="text-xs font-semibold uppercase text-[#6B7280]">{label}</span>
      <span className="text-right font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
      <div className="flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function UtilizationBar({ percent }: { percent: number }) {
  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-[#F3F4F6]">
        <div className="h-2 rounded-full bg-[#F97316]" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <p className="mt-1 text-xs text-[#6B7280]">{percent}% of businesses</p>
    </div>
  );
}
