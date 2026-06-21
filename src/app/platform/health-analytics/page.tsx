import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Download, FileSpreadsheet, FileText, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileAccordionSection } from "@/components/MobileAccordionSection";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
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

type TopBusinessRow = {
  businessId: number;
  businessName: string;
  value: number;
};

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

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Health & Analytics">
      <MobileAccordionSection title="Analytics Exports">
        <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Analytics exports</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111827]">Platform reporting workspace</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Export options prepare the current aggregated platform view without customer PII.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <ExportButton href="/platform/health-analytics/export?format=pdf" icon={<FileText className="h-4 w-4" />} label="PDF" />
            <ExportButton href="/platform/health-analytics/export?format=excel" icon={<FileSpreadsheet className="h-4 w-4" />} label="Excel" />
            <ExportButton href="/platform/health-analytics/export?format=csv" icon={<Download className="h-4 w-4" />} label="CSV" />
          </div>
        </div>
        </section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Platform Overview" defaultOpen>
        <Section title="Platform Overview">
        <MetricGrid>
          <Metric label="Total Businesses" value={totalBusinesses} />
          <Metric label="Active Businesses" value={activeBusinesses} />
          <Metric label="Inactive Businesses" value={inactiveBusinesses} />
          <Metric label="Total Branches" value={totalBranches} />
          <Metric label="Total Users" value={totalUsers} />
          <Metric label="Total Customers" value={totalCustomers} />
          <Metric label="Total Loyalty Programs" value={totalLoyaltyPrograms} />
        </MetricGrid>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Analytics Trends">
        <Section title="Analytics Trends">
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Business growth trend" points={businessGrowthTrend} />
          <ChartCard title="Customer growth trend" points={customerGrowthTrend} />
          <ChartCard title="Subscription growth trend" points={subscriptionGrowthTrend} />
          <ChartCard title="Alert trend" points={alertTrend} tone="alert" />
          <DistributionCard title="Plan distribution" points={planDistribution} />
        </div>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Top 10 Business Rankings">
        <Section title="Top 10 Business Rankings">
        <div className="grid gap-4 xl:grid-cols-3">
          <TopBusinessTable title="Top businesses by customers" rows={topBusinessesByCustomers} valueLabel="Customers" />
          <TopBusinessTable title="Top businesses by scans" rows={topBusinessesByScans} valueLabel="Scans" />
          <TopBusinessTable title="Top businesses by enrollments" rows={topBusinessesByEnrollments} valueLabel="Enrollments" />
        </div>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Loyalty Activity">
        <Section title="Loyalty Activity">
        <MetricGrid>
          <Metric label="Total Customer Enrollments" value={totalCustomerEnrollments} />
          <Metric label="Total Stamps Issued" value={totalEarnedStamps._sum.quantity ?? 0} />
          <Metric label="Total Bonus Stamps Issued" value={totalBonusStamps._sum.bonusStamps ?? 0} />
          <Metric label="Total Rewards Redeemed" value={totalRewardsRedeemed} />
          <Metric label="Total QR Scans" value={totalQrScans} />
          <Metric label="Average Customer Progress" value={`${averageProgress.toFixed(1)}%`} />
        </MetricGrid>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Subscription Overview">
        <Section title="Subscription Overview">
        <MetricGrid>
          {planRows.map((plan) => (
            <Metric key={plan.id} label={plan.name} value={subscriptionCounts.get(plan.id) ?? 0} />
          ))}
          <Metric label="Total Active Subscriptions" value={totalActiveSubscriptions} />
          <Metric label="Total Inactive Subscriptions" value={totalInactiveSubscriptions} />
        </MetricGrid>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Security Monitoring">
        <Section title="Security Monitoring">
        <MetricGrid>
          <Metric label="Failed Login Attempts (Last 24 Hours)" value={failedLoginAttempts} />
          <Metric label="Invalid QR Scan Attempts" value={invalidQrScans} />
          <Metric label="Disabled QR Scan Attempts" value={disabledQrScans} />
          <Metric label="Suspicious Multi-Stamp Transactions" value={suspiciousMultiStampTransactions} />
          <Metric label="Suspicious Activity Alerts" value={suspiciousActivityAlerts} />
        </MetricGrid>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Business Growth">
        <Section title="Business Growth">
        <MetricGrid>
          <Metric label="New Businesses This Month" value={newBusinessesThisMonth} />
          <Metric label="New Customers This Month" value={newCustomersThisMonth} />
          <Metric label="New Loyalty Programs This Month" value={newLoyaltyProgramsThisMonth} />
          <Metric label="New Enrollments This Month" value={newEnrollmentsThisMonth} />
        </MetricGrid>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Database & Storage Health">
        <Section title="Database & Storage Health">
        <MetricGrid>
          <HealthMetric label="PostgreSQL Database Status" connected={health.databaseConnected} />
          <HealthMetric label="Prisma Connected" connected={health.prismaConnected} />
          <Metric label="Database Size" value={databaseStats.databaseSize} />
          <Metric label="Number of Tables" value={databaseStats.tableCount} />
          <Metric label="Total Records" value={databaseStats.totalRecords} />
          <Metric label="QR Asset Storage Usage" value="0 MB" helper="QR codes are generated dynamically." />
          <Metric label="Branding Image Storage Usage" value="0 MB" helper="Logo URLs are stored externally." />
        </MetricGrid>
        </Section>
      </MobileAccordionSection>

      <MobileAccordionSection title="Recent Platform Activity">
        <Section title="Recent Platform Activity">
        <div className="grid gap-3 md:hidden">
          {recentActivity.map((item, index) => (
            <RecentActivityCard key={`${item.label}-${item.createdAt.toISOString()}-${index}`} item={item} />
          ))}
          {recentActivity.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">No platform activity yet.</p> : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Activity", "Subject", "Created At"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((item, index) => (
                <tr key={`${item.label}-${item.createdAt.toISOString()}-${index}`}>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{item.label}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{item.subject}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDateTime(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentActivity.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No platform activity yet.</p> : null}
        </div>
        </Section>
      </MobileAccordionSection>
    </DashboardShell>
  );
}

function RecentActivityCard({ item }: { item: ActivityItem }) {
  return (
    <article className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
      <p className="mt-2 text-sm text-[#6B7280]">{item.subject}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#F97316]">{formatDateTime(item.createdAt)}</p>
    </article>
  );
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricGrid({ children }: { children: ReactNode }) {
  return <PlatformKpiGrid className="gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</PlatformKpiGrid>;
}

function Metric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-3 md:p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#111827]">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-[#6B7280]">{helper}</p> : null}
    </div>
  );
}

function HealthMetric({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-3 md:p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
        <p className="text-sm font-semibold text-[#111827]">{connected ? "Connected" : "Not Connected"}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, points, tone = "default" }: { title: string; points: ChartPoint[]; tone?: "default" | "alert" }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const color = tone === "alert" ? "bg-red-500" : "bg-[#F97316]";

  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#111827]">{title}</h3>
        <TrendingUp className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
      </div>
      <div className="flex h-44 items-end gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end rounded-md bg-[#FAFAFA] px-1">
              <div className={`w-full rounded-t-md ${color}`} style={{ height: `${Math.max(6, (point.value / max) * 100)}%` }} title={`${point.label}: ${point.value}`} />
            </div>
            <p className="text-xs font-semibold text-[#111827]">{point.value}</p>
            <p className="text-xs text-[#6B7280]">{point.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistributionCard({ title, points }: { title: string; points: ChartPoint[] }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="rounded-md border border-[#E5E7EB] p-4 xl:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#111827]">{title}</h3>
        <BarChart3 className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {points.map((point) => {
          const percent = total > 0 ? Math.round((point.value / total) * 100) : 0;
          return (
            <div key={point.label} className="rounded-md border border-[#E5E7EB] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#111827]">{point.label}</p>
                <p className="text-sm font-semibold text-[#F97316]">{point.value}</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#F3F4F6]">
                <div className="h-2 rounded-full bg-[#F97316]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">{percent}% of active subscriptions</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopBusinessTable({ title, rows, valueLabel }: { title: string; rows: TopBusinessRow[]; valueLabel: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <h3 className="font-semibold text-[#111827]">{title}</h3>
      <div className="mt-4 grid gap-2">
        {rows.map((row, index) => (
          <div key={`${row.businessId}-${index}`} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-md bg-[#FAFAFA] px-3 py-2 text-sm">
            <span className="font-semibold text-[#F97316]">#{index + 1}</span>
            <span className="min-w-0 truncate font-semibold text-[#111827]">{row.businessName}</span>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#6B7280]">{row.value} {valueLabel}</span>
          </div>
        ))}
        {rows.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">No data available yet.</p> : null}
      </div>
    </div>
  );
}

function ExportButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]">
      {icon}
      {label}
    </Link>
  );
}

