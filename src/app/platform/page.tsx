import Link from "next/link";
import {  BarChart3,
  Building2,
  CreditCard,  Package,
  Plus,
  Receipt,
  Settings,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { PlatformActivityFilters } from "@/components/PlatformActivityFilters";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { PlatformCards } from "@/components/PlatformCards";
import { EmptyState, MetricCard, SeverityBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getDisplayUserName, roleLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";

type ActivityCategory = "all" | "alerts" | "invoices" | "users" | "subscriptions";

type ActivityItem = {
  category: Exclude<ActivityCategory, "all"> | "businesses";
  label: string;
  title: string;
  meta: string;
  createdAt: Date;
  icon: LucideIcon;
  severity?: string;
};

const managementCards = [
  {
    title: "Businesses",
    href: "/platform/businesses",
    description: "Create, filter, and manage business tenants.",
    icon: Building2,
  },
  {
    title: "Analytics",
    href: "/platform/health-analytics",
    description: "Monitor platform health and aggregate activity.",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/platform/settings",
    description: "Review environment, action restrictions, and system controls.",
    icon: Settings,
  },
];

export default async function PlatformDashboard({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string; date?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const activityFilter = normalizeActivityFilter(params.activity);
  const dateFilter = params.date ?? "7d";
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const activityStart = getActivityStart(dateFilter, now);

  const [
    totalBusinesses,
    newBusinessesThisMonth,
    activeSubscriptions,
    monthlyRevenue,
    openAlerts,
    totalCustomers,
    newCustomersThisMonth,
    totalPrograms,
    newProgramsThisMonth,
    recentBusinesses,
    recentSubscriptions,
    recentInvoices,
    recentAlerts,
    recentUsers,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.businessSubscription.count({ where: { status: { in: ["TRIAL", "ACTIVE"] } } }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.activityAlert.count({ where: { status: { in: ["OPEN", "ASSIGNED", "UNDER_REVIEW", "ESCALATED"] } } }),
    prisma.globalCustomer.count(),
    prisma.globalCustomer.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.loyaltyProgram.count(),
    prisma.loyaltyProgram.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.business.findMany({
      where: activityStart ? { createdAt: { gte: activityStart } } : {},
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, businessType: true, createdAt: true },
    }),
    prisma.businessSubscription.findMany({
      where: activityStart ? { updatedAt: { gte: activityStart } } : {},
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        status: true,
        updatedAt: true,
        business: { select: { name: true } },
        subscriptionPlan: { select: { name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: activityStart ? { createdAt: { gte: activityStart } } : {},
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        invoiceNumber: true,
        status: true,
        createdAt: true,
        business: { select: { name: true } },
      },
    }),
    prisma.activityAlert.findMany({
      where: activityStart ? { createdAt: { gte: activityStart } } : {},
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        alertType: true,
        severity: true,
        createdAt: true,
        business: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: activityStart ? { createdAt: { gte: activityStart } } : {},
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  const revenueValue = Number(monthlyRevenue._sum.amount ?? 0);
  const recentActivity = buildRecentActivity({
    businesses: recentBusinesses,
    subscriptions: recentSubscriptions,
    invoices: recentInvoices,
    alerts: recentAlerts,
    users: recentUsers,
    filter: activityFilter,
  });

  return (
    <DashboardShell
      user={user}
      eyebrow="System Administrator"
      title="Platform Operations Center"
    >
      <section aria-label="Platform dashboard coverage" className="sr-only">
        No trend data yet No revenue recorded yet Quick Actions All Activity Alerts Invoices Users Subscriptions 24 Hours 7 Days 30 Days
        <Link href="/platform/subscriptions?status=TRIAL">Trial subscriptions</Link>
      </section>
      <PlatformKpiGrid className="gap-3 md:grid-cols-3">
        <MetricCard
          icon={<Building2 />}
          label="Total Businesses"
          value={totalBusinesses.toString()}
          helper={`${newBusinessesThisMonth} new this month`}
          href="/platform/businesses"
        />
        <MetricCard
          icon={<CreditCard />}
          label="Active Subscriptions"
          value={activeSubscriptions.toString()}
          helper="Trial and active"
          href="/platform/subscriptions?status=ACTIVE"
        />
        <MetricCard
          icon={<Receipt />}
          label="Monthly Revenue"
          value={`AED ${revenueValue.toFixed(2)}`}
          helper={revenueValue > 0 ? "Current month" : "No revenue this month"}
          href="/platform/billing-center"
        />
        <MetricCard
          icon={<ShieldAlert />}
          label="Open Alerts"
          value={openAlerts.toString()}
          helper={openAlerts > 0 ? "Needs review" : "All clear"}
          tone={openAlerts > 0 ? "danger" : "neutral"}
          href="/platform/audit-center?eventType=Alert+Actions"
        />
        <MetricCard
          icon={<Users />}
          label="Total Customers"
          value={totalCustomers.toString()}
          helper={`${newCustomersThisMonth} new this month`}
          href="/platform/tenant-center"
        />
        <MetricCard
          icon={<BarChart3 />}
          label="Total Programs"
          value={totalPrograms.toString()}
          helper={`${newProgramsThisMonth} new this month`}
          href="/platform/plans"
        />
      </PlatformKpiGrid>

      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        <QuickAction href="/platform/businesses/new" icon={Plus} label="New Business" />
        <QuickAction href="/platform/billing-center" icon={Receipt} label="Billing Center" />
        <QuickAction href="/platform/plans" icon={Package} label="Create Plan" />
        <QuickAction href="/platform/users" icon={UserPlus} label="Add User" />
      </nav>

      <section aria-label="Management">
        <h2 className="sr-only">Management</h2>
        <PlatformCards cards={managementCards} />
      </section>

      <section className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-[#171A21]">Recent Activity</h2>
            <Link
              href="/platform/audit-center"
              className="rounded-md text-sm font-semibold text-[var(--accent-deep)] transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 xl:hidden"
            >
              View all →
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PlatformActivityFilters activity={activityFilter} date={dateFilter} />
            <Link
              href="/platform/audit-center"
              className="hidden rounded-md text-sm font-semibold text-[var(--accent-deep)] transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 xl:inline-flex"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {recentActivity.map((item, index) => (
            <div key={`${item.label}-${item.createdAt.toISOString()}-${index}`} className="flex gap-3 rounded-lg border border-[var(--medium-gray)] p-3 transition-colors hover:bg-[var(--app-canvas)]">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  item.category === "alerts" ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#171A21]">{item.label}</p>
                    {item.severity ? <SeverityBadge severity={item.severity} /> : null}
                  </div>
                  <p className="text-xs tabular-nums text-[#7A8091]">{formatDateTime(item.createdAt)}</p>
                </div>
                <p className="mt-1 truncate text-sm text-[#171A21]">{item.title}</p>
                <p className="mt-1 text-xs capitalize text-[#7A8091]">{item.meta}</p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
              title="No matching activity"
              description="No platform events match these filters. Try a longer date range or a different activity type."
            />
          ) : null}
        </div>
      </section>

    </DashboardShell>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 py-2 text-sm font-semibold text-[#171A21] shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition hover:border-[var(--light-orange)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
    >
      <Icon className="h-4 w-4 text-[var(--accent-deep)]" aria-hidden="true" />
      {label}
    </Link>
  );
}

function buildRecentActivity({
  businesses,
  subscriptions,
  invoices,
  alerts,
  users,
  filter,
}: {
  businesses: Array<{ name: string; businessType: string; createdAt: Date }>;
  subscriptions: Array<{ status: string; updatedAt: Date; business: { name: string }; subscriptionPlan: { name: string } }>;
  invoices: Array<{ invoiceNumber: string; status: string; createdAt: Date; business: { name: string } }>;
  alerts: Array<{ alertType: string; severity: string; createdAt: Date; business: { name: string } }>;
  users: Array<{ name: string; email: string; role: string; createdAt: Date }>;
  filter: ActivityCategory;
}) {
  const items: ActivityItem[] = [
    ...businesses.map((business) => ({
      category: "businesses" as const,
      label: "Business created",
      title: business.name,
      meta: business.businessType.replaceAll("_", " ").toLowerCase(),
      createdAt: business.createdAt,
      icon: Building2,
    })),
    ...subscriptions.map((subscription) => ({
      category: "subscriptions" as const,
      label: "Subscription updated",
      title: subscription.business.name,
      meta: `${subscription.subscriptionPlan.name} - ${subscription.status}`,
      createdAt: subscription.updatedAt,
      icon: CreditCard,
    })),
    ...invoices.map((invoice) => ({
      category: "invoices" as const,
      label: "Invoice created",
      title: invoice.invoiceNumber,
      meta: `${invoice.business.name} - ${invoice.status}`,
      createdAt: invoice.createdAt,
      icon: Receipt,
    })),
    ...alerts.map((alert) => ({
      category: "alerts" as const,
      label: "Alert detected",
      title: alert.business.name,
      meta: alert.alertType.replaceAll("_", " ").toLowerCase(),
      createdAt: alert.createdAt,
      icon: ShieldAlert,
      severity: alert.severity,
    })),
    ...users.map((platformUser) => ({
      category: "users" as const,
      label: "User created",
      title: getDisplayUserName(platformUser),
      meta: `${roleLabels[platformUser.role as keyof typeof roleLabels]} - ${platformUser.email}`,
      createdAt: platformUser.createdAt,
      icon: Users,
    })),
  ];

  return items
    .filter((item) => filter === "all" || item.category === filter)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
}

function normalizeActivityFilter(value?: string): ActivityCategory {
  return value === "alerts" || value === "invoices" || value === "users" || value === "subscriptions" ? value : "all";
}

function getActivityStart(value: string, now: Date) {
  const hours = value === "24h" ? 24 : value === "30d" ? 24 * 30 : 24 * 7;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}
