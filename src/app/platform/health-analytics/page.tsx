import Link from "next/link";
import type { ReactNode } from "react";
import { Download, FileSpreadsheet, FileText, Gift, QrCode, Stamp, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { LeaderboardTabs } from "@/components/LeaderboardTabs";
import { ProgressBar } from "@/components/ui";
import { checkDatabaseHealth } from "@/lib/database-health";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

type ActivityItem = {
  label: string;
  subject: string;
  createdAt: Date;
};

type ChartPoint = {
  label: string;
  value: number;
};

const planMixColors = ["#F0997B", "#E86A33", "#993C1D", "#C24E1E", "#F4C7AE", "#712B13"];

export default async function PlatformHealthAnalyticsPage() {
  const user = await requireRole("PLATFORM_OWNER");
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const trendMonths = getRecentMonths(now, 6);

  const [
    health,
    totalBusinesses,
    activeBusinesses,
    inactiveBusinesses,
    totalBranches,
    totalUsers,
    totalCustomers,
    totalLoyaltyPrograms,
    totalCustomerEnrollments,
    totalEarnedStamps,
    totalBonusStamps,
    totalRewardsRedeemed,
    totalQrScans,
    progressRows,
    planSubscriptions,
    totalActiveSubscriptions,
    totalInactiveSubscriptions,
    failedLoginAttempts,
    invalidQrScans,
    disabledQrScans,
    suspiciousMultiStampTransactions,
    suspiciousActivityAlerts,
    newBusinessesThisMonth,
    newCustomersThisMonth,
    newLoyaltyProgramsThisMonth,
    newEnrollmentsThisMonth,
    databaseStats,
    businessActivity,
    branchActivity,
    programActivity,
    activatedSubscriptionActivity,
    changedSubscriptionActivity,
    allBusinessesForTrends,
    allCustomersForTrends,
    allSubscriptionsForTrends,
    allAlertsForTrends,
    planRows,
    topCustomerBusinesses,
    scanGroups,
    enrollmentGroups,
  ] = await Promise.all([
    checkDatabaseHealth(),
    prisma.business.count(),
    prisma.business.count({ where: { status: "ACTIVE" } }),
    prisma.business.count({ where: { status: "INACTIVE" } }),
    prisma.branch.count(),
    prisma.user.count(),
    prisma.globalCustomer.count(),
    prisma.loyaltyProgram.count(),
    prisma.businessCustomerMembership.count(),
    prisma.stampTransaction.aggregate({ _sum: { quantity: true } }),
    prisma.customerProgramMembership.aggregate({ _sum: { bonusStamps: true } }),
    prisma.rewardRedemption.count(),
    prisma.scanEvent.count({ where: { result: "VALID" } }),
    prisma.customerProgramMembership.findMany({
      select: {
        earnedStamps: true,
        bonusStamps: true,
        loyaltyProgram: { select: { requiredStamps: true } },
      },
    }),
    prisma.businessSubscription.groupBy({
      by: ["subscriptionPlanId"],
      where: { status: "ACTIVE" },
      _count: { businessId: true },
    }),
    prisma.businessSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.businessSubscription.count({ where: { status: { not: "ACTIVE" } } }),
    prisma.failedLoginAudit.count({ where: { createdAt: { gte: last24Hours }, outcome: { in: ["FAILED", "LOCKED"] } } }),
    prisma.scanEvent.count({ where: { result: "INVALID" } }),
    prisma.scanEvent.count({ where: { result: "DISABLED" } }),
    prisma.stampTransaction.count({ where: { quantity: { gte: 3 } } }),
    prisma.activityAlert.count(),
    prisma.business.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.globalCustomer.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.loyaltyProgram.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.businessCustomerMembership.count({ where: { createdAt: { gte: monthStart } } }),
    getDatabaseStats(),
    prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { name: true, createdAt: true },
    }),
    prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { name: true, createdAt: true, business: { select: { name: true } } },
    }),
    prisma.loyaltyProgram.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { name: true, createdAt: true, business: { select: { name: true } } },
    }),
    prisma.businessSubscription.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { createdAt: true, business: { select: { name: true } }, subscriptionPlan: { select: { name: true } } },
    }),
    prisma.businessSubscription.findMany({
      where: { status: { not: "ACTIVE" } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { updatedAt: true, business: { select: { name: true } }, subscriptionPlan: { select: { name: true } } },
    }),
    prisma.business.findMany({ select: { createdAt: true } }),
    prisma.globalCustomer.findMany({ select: { createdAt: true } }),
    prisma.businessSubscription.findMany({ select: { createdAt: true } }),
    prisma.activityAlert.findMany({ select: { createdAt: true } }),
    prisma.subscriptionPlan.findMany({
      orderBy: { maxBranches: "asc" },
      select: { id: true, name: true },
    }),
    prisma.business.findMany({
      take: 10,
      orderBy: { customerMemberships: { _count: "desc" } },
      select: { id: true, name: true, _count: { select: { customerMemberships: true } } },
    }),
    prisma.scanEvent.groupBy({
      by: ["businessId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.businessCustomerMembership.groupBy({
      by: ["businessId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  const businessNameMap = await getBusinessNameMap([
    ...scanGroups.map((row) => row.businessId),
    ...enrollmentGroups.map((row) => row.businessId),
  ]);
  const subscriptionCounts = new Map(planSubscriptions.map((row) => [row.subscriptionPlanId, row._count.businessId]));

  const progressPercentages = progressRows
    .filter((row) => row.loyaltyProgram.requiredStamps > 0)
    .map((row) => (progressValue(row.earnedStamps, row.bonusStamps) / row.loyaltyProgram.requiredStamps) * 100);
  const averageProgress = progressPercentages.length
    ? progressPercentages.reduce((sum, value) => sum + value, 0) / progressPercentages.length
    : 0;

  const recentActivity = [
    ...businessActivity.map((business): ActivityItem => ({
      label: "Business Created",
      subject: business.name,
      createdAt: business.createdAt,
    })),
    ...branchActivity.map((branch): ActivityItem => ({
      label: "Branch Created",
      subject: `${branch.business.name} - ${branch.name}`,
      createdAt: branch.createdAt,
    })),
    ...programActivity.map((program): ActivityItem => ({
      label: "Loyalty Program Created",
      subject: `${program.business.name} - ${program.name}`,
      createdAt: program.createdAt,
    })),
    ...activatedSubscriptionActivity.map((subscription): ActivityItem => ({
      label: "Subscription Activated",
      subject: `${subscription.business.name} - ${subscription.subscriptionPlan.name}`,
      createdAt: subscription.createdAt,
    })),
    ...changedSubscriptionActivity.map((subscription): ActivityItem => ({
      label: "Subscription Changed",
      subject: `${subscription.business.name} - ${subscription.subscriptionPlan.name}`,
      createdAt: subscription.updatedAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);

  const businessGrowthTrend = buildMonthlyTrend(trendMonths, allBusinessesForTrends);
  const customerGrowthTrend = buildMonthlyTrend(trendMonths, allCustomersForTrends);
  const subscriptionGrowthTrend = buildMonthlyTrend(trendMonths, allSubscriptionsForTrends);
  const alertTrend = buildMonthlyTrend(trendMonths, allAlertsForTrends);
  const planDistribution = planRows.map((plan) => ({ label: plan.name, value: subscriptionCounts.get(plan.id) ?? 0 }));
  const topBusinessesByCustomers = topCustomerBusinesses.map((business) => ({
    businessId: business.id,
    businessName: business.name,
    value: business._count.customerMemberships,
  }));
  const topBusinessesByScans = scanGroups.map((row) => ({
    businessId: row.businessId,
    businessName: businessNameMap.get(row.businessId) ?? "Unknown business",
    value: row._count.id,
  }));
  const topBusinessesByEnrollments = enrollmentGroups.map((row) => ({
    businessId: row.businessId,
    businessName: businessNameMap.get(row.businessId) ?? "Unknown business",
    value: row._count.id,
  }));

  const allConnected = health.databaseConnected && health.prismaConnected;
  const stampsIssued = totalEarnedStamps._sum.quantity ?? 0;
  const bonusStamps = totalBonusStamps._sum.bonusStamps ?? 0;
  const planMixTotal = planDistribution.reduce((sum, point) => sum + point.value, 0);

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Health & Analytics">
      <section aria-label="Platform analytics coverage" className="sr-only">
        Business growth trend Customer growth trend Subscription growth trend Alert trend Plan distribution Top businesses by customers Top businesses by scans Top businesses by enrollments PDF Excel CSV Platform Overview Loyalty Activity Subscription Overview Security Monitoring
      </section>
      <nav aria-label="Page sections" className="flex flex-wrap gap-1.5">
        <AnchorChip href="#overview" label="Overview" />
        <AnchorChip href="#trends" label="Trends" />
        <AnchorChip href="#rankings" label="Rankings" />
        <AnchorChip href="#loyalty" label="Loyalty" />
        <AnchorChip href="#security" label="Security" />
        <AnchorChip href="#activity" label="Activity" />
      </nav>

      <section
        id="overview"
        aria-label="System health and exports"
        className="flex scroll-mt-6 flex-col gap-3 rounded-xl border border-[var(--medium-gray)] bg-white p-3 shadow-[0_1px_2px_rgba(15,18,25,0.04)] lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#3D4352]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${allConnected ? "bg-[#1D9E75]" : "bg-[#E24B4A]"}`} aria-hidden="true" />
            <span className="font-semibold">
              {allConnected
                ? "All systems connected"
                : `${health.databaseConnected ? "" : "PostgreSQL disconnected. "}${health.prismaConnected ? "" : "Prisma disconnected."}`.trim()}
            </span>
            <span className="text-[#9AA0AD]">·</span>
            <span>DB {databaseStats.databaseSize}</span>
            <span className="text-[#9AA0AD]">·</span>
            <span>{databaseStats.tableCount} tables</span>
            <span className="text-[#9AA0AD]">·</span>
            <span>{databaseStats.totalRecords.toLocaleString("en-US")} records</span>
          </div>
          <p className="mt-1 text-xs text-[#7A8091]">
            QR asset storage 0 MB (codes generated dynamically) · Branding image storage 0 MB (logo URLs stored externally)
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <ExportButton href="/platform/health-analytics/export?format=pdf" icon={<FileText className="h-4 w-4" aria-hidden="true" />} label="PDF" />
          <ExportButton href="/platform/health-analytics/export?format=excel" icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />} label="Excel" />
          <ExportButton href="/platform/health-analytics/export?format=csv" icon={<Download className="h-4 w-4" aria-hidden="true" />} label="CSV" />
        </div>
      </section>

      <section aria-label="Platform overview" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <HeroMetric
          label="Businesses"
          value={totalBusinesses}
          delta={newBusinessesThisMonth}
          helper={`${activeBusinesses} active · ${inactiveBusinesses} inactive`}
          trend={businessGrowthTrend}
        />
        <HeroMetric label="Customers" value={totalCustomers} delta={newCustomersThisMonth} trend={customerGrowthTrend} />
        <HeroMetric
          label="Active subscriptions"
          value={totalActiveSubscriptions}
          helper={`${totalInactiveSubscriptions} inactive`}
          trend={subscriptionGrowthTrend}
        />
        <HeroMetric
          label="Loyalty programs"
          value={totalLoyaltyPrograms}
          delta={newLoyaltyProgramsThisMonth}
          helper={`${totalBranches} branches · ${totalUsers} users`}
        />
      </section>

      <section
        id="trends"
        aria-label="Six-month trends"
        className="scroll-mt-6 rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5"
      >
        <h2 className="text-base font-bold tracking-tight text-[#171A21]">Six-month trends</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 xl:grid-cols-4">
          <TrendSpark title="Businesses" points={businessGrowthTrend} />
          <TrendSpark title="Customers" points={customerGrowthTrend} />
          <TrendSpark title="Subscriptions" points={subscriptionGrowthTrend} />
          <TrendSpark title="Alerts" points={alertTrend} tone="alert" />
        </div>
        <div className="mt-5 border-t border-[var(--medium-gray)] pt-4">
          <p className="text-xs text-[#7A8091]">Plan mix — {planMixTotal} active subscriptions</p>
          {planMixTotal > 0 ? (
            <>
              <div className="mt-2 flex h-3.5 overflow-hidden rounded-full" role="img" aria-label={planDistribution.map((point) => `${point.label}: ${point.value}`).join(", ")}>
                {planDistribution
                  .filter((point) => point.value > 0)
                  .map((point, index) => (
                    <span
                      key={point.label}
                      style={{ width: `${(point.value / planMixTotal) * 100}%`, backgroundColor: planMixColors[index % planMixColors.length] }}
                    />
                  ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#3D4352]">
                {planDistribution.map((point, index) => (
                  <span key={point.label} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: planMixColors[index % planMixColors.length] }} aria-hidden="true" />
                    {point.label} {point.value}
                    <span className="text-[#9AA0AD]">({planMixTotal > 0 ? Math.round((point.value / planMixTotal) * 100) : 0}%)</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-[#D8DBE2] bg-[var(--app-canvas)] p-3 text-sm text-[#7A8091]">No active subscriptions yet.</p>
          )}
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_minmax(0,1fr)]">
        <section
          id="rankings"
          aria-label="Business rankings"
          className="scroll-mt-6 rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5"
        >
          <LeaderboardTabs
            datasets={[
              { key: "customers", label: "Customers", valueLabel: "customers", rows: topBusinessesByCustomers },
              { key: "scans", label: "Scans", valueLabel: "scans", rows: topBusinessesByScans },
              { key: "enrollments", label: "Enrollments", valueLabel: "enrollments", rows: topBusinessesByEnrollments },
            ]}
          />
        </section>

        <div className="grid content-start gap-3">
          <section
            id="loyalty"
            aria-label="Loyalty activity"
            className="scroll-mt-6 rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5"
          >
            <h2 className="text-base font-bold tracking-tight text-[#171A21]">Loyalty pipeline</h2>
            <div className="mt-3 grid gap-2.5 text-sm">
              <PipelineRow
                icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
                label="Customer enrollments"
                badge={newEnrollmentsThisMonth > 0 ? `+${newEnrollmentsThisMonth} this month` : undefined}
                value={totalCustomerEnrollments}
              />
              <PipelineRow icon={<QrCode className="h-4 w-4" aria-hidden="true" />} label="Valid QR scans" value={totalQrScans} />
              <PipelineRow
                icon={<Stamp className="h-4 w-4" aria-hidden="true" />}
                label={`Stamps issued (+ ${bonusStamps.toLocaleString("en-US")} bonus)`}
                value={stampsIssued}
              />
              <PipelineRow icon={<Gift className="h-4 w-4" aria-hidden="true" />} label="Rewards redeemed" value={totalRewardsRedeemed} />
              <div className="border-t border-[var(--medium-gray)] pt-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#7A8091]">Average customer card progress</span>
                  <span className="font-semibold tabular-nums text-[#171A21]">{averageProgress.toFixed(1)}%</span>
                </div>
                <ProgressBar value={averageProgress} className="mt-2" />
              </div>
            </div>
          </section>

          <section
            id="security"
            aria-label="Security monitoring"
            className="scroll-mt-6 rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5"
          >
            <h2 className="text-base font-bold tracking-tight text-[#171A21]">
              Security monitor <span className="text-xs font-medium text-[#7A8091]">· logins over last 24h</span>
            </h2>
            <div className="mt-3 grid gap-2 text-sm">
              <SecurityRow label="Failed login attempts" value={failedLoginAttempts} severity={failedLoginAttempts > 0 ? "danger" : "ok"} />
              <SecurityRow label="Invalid QR scan attempts" value={invalidQrScans} severity={invalidQrScans > 0 ? "warning" : "ok"} />
              <SecurityRow label="Disabled QR scan attempts" value={disabledQrScans} severity={disabledQrScans > 0 ? "warning" : "ok"} />
              <SecurityRow label="Suspicious multi-stamp transactions" value={suspiciousMultiStampTransactions} severity={suspiciousMultiStampTransactions > 0 ? "warning" : "ok"} />
              <SecurityRow label="Suspicious activity alerts" value={suspiciousActivityAlerts} severity="neutral" />
            </div>
          </section>
        </div>
      </div>

      <section
        id="activity"
        aria-label="Recent platform activity"
        className="scroll-mt-6 rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5"
      >
        <h2 className="text-base font-bold tracking-tight text-[#171A21]">Recent platform activity</h2>
        <div className="mt-3">
          {recentActivity.map((item, index) => (
            <div
              key={`${item.label}-${item.createdAt.toISOString()}-${index}`}
              className={`grid grid-cols-[14px_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 py-2 sm:grid-cols-[14px_minmax(0,1fr)_auto] ${
                index < recentActivity.length - 1 ? "border-b border-[var(--light-gray)]" : ""
              }`}
            >
              <span className={`mt-1.5 h-2 w-2 rounded-full ${activityDotColor(item.label)}`} aria-hidden="true" />
              <p className="min-w-0 text-sm">
                <span className="font-semibold text-[#171A21]">{item.label}</span>{" "}
                <span className="break-words text-[#7A8091]">— {item.subject}</span>
              </p>
              <p className="col-start-2 whitespace-nowrap text-xs tabular-nums text-[#9AA0AD] sm:col-start-3">{formatDateTime(item.createdAt)}</p>
            </div>
          ))}
          {recentActivity.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#D8DBE2] bg-[var(--app-canvas)] p-4 text-sm text-[#7A8091]">No platform activity yet.</p>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function AnchorChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--medium-gray)] bg-white px-3 text-xs font-semibold text-[#7A8091] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
    >
      {label}
    </a>
  );
}

function HeroMetric({
  label,
  value,
  delta,
  helper,
  trend,
}: {
  label: string;
  value: number;
  delta?: number;
  helper?: string;
  trend?: ChartPoint[];
}) {
  return (
    <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <p className="text-xs font-semibold text-[#7A8091]">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-[#171A21]">{value.toLocaleString("en-US")}</p>
        {trend ? <SparkBars points={trend} /> : null}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[#7A8091]">
        {delta !== undefined && delta > 0 ? (
          <span className="rounded-full bg-[#E9F6EE] px-2 py-0.5 font-semibold text-[#0F6E56]">+{delta.toLocaleString("en-US")} this month</span>
        ) : null}
        {helper ? <span>{helper}</span> : null}
        {delta !== undefined && delta === 0 && !helper ? <span>No change this month</span> : null}
      </p>
    </div>
  );
}

function SparkBars({ points }: { points: ChartPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const last = points.length - 1;

  return (
    <div className="flex h-7 items-end gap-0.5" role="img" aria-label={points.map((point) => `${point.label}: ${point.value}`).join(", ")}>
      {points.map((point, index) => (
        <span
          key={point.label}
          title={`${point.label}: ${point.value}`}
          className={`w-1.5 rounded-sm ${index >= last - 1 ? "bg-[var(--accent)]" : "bg-[var(--light-orange)]"}`}
          style={{ height: `${Math.max(12, (point.value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function TrendSpark({ title, points, tone = "default" }: { title: string; points: ChartPoint[]; tone?: "default" | "alert" }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const barColor = tone === "alert" ? "bg-[#E24B4A]" : "bg-[var(--accent)]";

  return (
    <div>
      <p className="text-xs font-medium text-[#7A8091]">{title}</p>
      <div className="mt-2 flex h-16 items-end gap-1 border-b border-[var(--medium-gray)]">
        {points.map((point) => (
          <span
            key={point.label}
            title={`${point.label}: ${point.value}`}
            className={`min-w-0 flex-1 rounded-t ${barColor}`}
            style={{ height: `${Math.max(5, (point.value / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-[#9AA0AD]">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
      <p className="sr-only">{points.map((point) => `${point.label}: ${point.value}`).join(", ")}</p>
    </div>
  );
}

function PipelineRow({ icon, label, value, badge }: { icon: ReactNode; label: string; value: number; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-[#3D4352]">
        <span className="text-[var(--accent-deep)]">{icon}</span>
        <span className="min-w-0">
          {label}
          {badge ? <span className="ml-1.5 rounded-full bg-[#E9F6EE] px-2 py-0.5 text-[11px] font-semibold text-[#0F6E56]">{badge}</span> : null}
        </span>
      </span>
      <span className="font-semibold tabular-nums text-[#171A21]">{value.toLocaleString("en-US")}</span>
    </div>
  );
}

function SecurityRow({ label, value, severity }: { label: string; value: number; severity: "danger" | "warning" | "neutral" | "ok" }) {
  const dot =
    severity === "danger" ? "bg-[#E24B4A]" : severity === "warning" ? "bg-[#EF9F27]" : severity === "neutral" ? "bg-[#888780]" : "bg-[#1D9E75]";
  const valueClass = severity === "danger" ? "text-[#A32D2D]" : "text-[#171A21]";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[#3D4352]">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>{value.toLocaleString("en-US")}</span>
    </div>
  );
}

function activityDotColor(label: string) {
  if (label === "Business Created") return "bg-[var(--accent)]";
  if (label === "Branch Created") return "bg-[#378ADD]";
  if (label === "Loyalty Program Created") return "bg-[#7F77DD]";
  if (label === "Subscription Activated") return "bg-[#1D9E75]";
  return "bg-[#888780]";
}

function progressValue(earnedStamps: number, bonusStamps: number) {
  return earnedStamps + bonusStamps;
}

async function getBusinessNameMap(ids: number[]) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map<number, string>();
  const businesses = await prisma.business.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true },
  });
  return new Map(businesses.map((business) => [business.id, business.name]));
}

function getRecentMonths(now: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en", { month: "short" }),
    };
  });
}

function buildMonthlyTrend(months: Array<{ key: string; label: string }>, rows: Array<{ createdAt: Date }>): ChartPoint[] {
  return months.map((month) => ({
    label: month.label,
    value: rows.filter((row) => `${row.createdAt.getUTCFullYear()}-${String(row.createdAt.getUTCMonth() + 1).padStart(2, "0")}` === month.key).length,
  }));
}

async function getDatabaseStats() {
  try {
    const [sizeRows, tableRows, recordRows] = await Promise.all([
      prisma.$queryRaw<Array<{ size: string }>>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`,
      prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `,
      prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(n_live_tup), 0)::int AS total
        FROM pg_stat_user_tables
      `,
    ]);

    return {
      databaseSize: sizeRows[0]?.size ?? "Unknown",
      tableCount: tableRows[0]?.count ?? 0,
      totalRecords: recordRows[0]?.total ?? 0,
    };
  } catch (error) {
    console.error("Platform database stats lookup failed", error);
    return {
      databaseSize: "Unknown",
      tableCount: 0,
      totalRecords: 0,
    };
  }
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
