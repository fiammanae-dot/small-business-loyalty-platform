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
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { PlatformCards } from "@/components/PlatformCards";
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
      <PlatformKpiGrid className="gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Building2} label="Total Businesses" value={totalBusinesses.toString()} trend={`${newBusinessesThisMonth} new this month`} href="/platform/businesses" />
        <KpiCard icon={CreditCard} label="Active Subscriptions" value={activeSubscriptions.toString()} href="/platform/subscriptions?status=ACTIVE" />
        <KpiCard
          icon={Receipt}
          label="Monthly Revenue"
          value={revenueValue > 0 ? `AED ${revenueValue.toFixed(2)}` : "No revenue recorded yet"}
          trend={revenueValue > 0 ? "Current month" : undefined}
          href="/platform/billing-center"
        />
        <KpiCard icon={ShieldAlert} label="Open Alerts" value={openAlerts.toString()} tone={openAlerts > 0 ? "alert" : "default"} href="/platform/audit-center?eventType=Alert+Actions" />
        <KpiCard icon={Users} label="Total Customers" value={totalCustomers.toString()} trend={`${newCustomersThisMonth} new this month`} href="/platform/tenant-center" />
        <KpiCard icon={BarChart3} label="Total Programs" value={totalPrograms.toString()} trend={`${newProgramsThisMonth} new this month`} href="/platform/plans" />
      </PlatformKpiGrid>

      <section className="rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#C24E1E]">Quick Actions</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-[#171A21]">Common platform tasks</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/platform/businesses/new" icon={Plus} label="New Business" />
            <QuickAction href="/platform/billing-center" icon={Receipt} label="Billing Center" />
            <QuickAction href="/platform/plans" icon={Package} label="Create Plan" />
            <QuickAction href="/platform/users" icon={UserPlus} label="Add User" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-[13px] font-semibold text-[#C24E1E]">Management</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-[#171A21]">Primary operations</h2>
        </div>
        <PlatformCards cards={managementCards} />
      </section>

      <section className="rounded-xl border border-[#E7E9EE] bg-white p-5 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#C24E1E]">Recent Activity</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-[#171A21]">Latest platform events</h2>
          </div>
          <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select name="activity" defaultValue={activityFilter} className="h-10 rounded-lg border border-[#E7E9EE] bg-white px-3 text-sm text-[#3D4352]">
              <option value="all">All Activity</option>
              <option value="alerts">Alerts</option>
              <option value="invoices">Invoices</option>
              <option value="users">Users</option>
              <option value="subscriptions">Subscriptions</option>
            </select>
            <select name="date" defaultValue={dateFilter} className="h-10 rounded-lg border border-[#E7E9EE] bg-white px-3 text-sm text-[#3D4352]">
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
            <button type="submit" className="h-10 rounded-lg bg-[#E86A33] px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(232,106,51,0.25)] transition hover:bg-[#C24E1E]">Apply</button>
          </form>
        </div>
        <div className="mt-5 grid gap-3">
          {recentActivity.map((item, index) => (
            <div key={`${item.label}-${item.createdAt.toISOString()}-${index}`} className="flex gap-3 rounded-lg border border-[#E7E9EE] p-3 transition-colors hover:bg-[#F6F7F9]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FBEFE8] text-[#C24E1E]">
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
          {recentActivity.length === 0 ? <p className="rounded-lg border border-dashed border-[#D8DBE2] bg-[#F6F7F9] p-4 text-sm text-[#7A8091]">No platform activity matches these filters.</p> : null}
        </div>
      </section>

    </DashboardShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  tone = "default",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  tone?: "default" | "alert";
  href?: string;
}) {
  const content = (
    <div className={`h-full rounded-xl border bg-white p-3 shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition duration-200 ease-out md:p-4 ${tone === "alert" ? "border-red-200 bg-[#FFFBF2]" : "border-[#E7E9EE]"} ${href ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#F4C7AE] hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="line-clamp-2 min-w-0 text-xs font-semibold leading-tight text-[#7A8091]">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === "alert" ? "bg-red-50 text-red-600" : "bg-[#FBEFE8] text-[#C24E1E]"}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 font-bold tracking-tight tabular-nums text-[#171A21] ${value.length > 12 ? "text-base leading-6" : "text-[26px] leading-none"}`}>{value}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs font-medium text-[#7A8091]">
        <span>{trend ?? "No trend data yet"}</span>
        {href ? <span className="font-semibold text-[#C24E1E]">View →</span> : null}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block h-full cursor-pointer rounded-xl focus:outline-none focus:ring-4 focus:ring-[#FBEFE8]">{content}</Link> : content;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 rounded-lg border border-[#E7E9EE] bg-[#F3F4F7] px-3 py-2 text-sm font-semibold text-[#171A21] transition hover:border-[#F4C7AE] hover:bg-[#FBEFE8] hover:text-[#C24E1E]">
      <Icon className="h-4 w-4 text-[#C24E1E]" aria-hidden="true" />
      {label}
    </Link>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes =
    severity === "CRITICAL"
      ? "bg-red-100 text-red-800"
      : severity === "HIGH"
        ? "bg-red-50 text-red-700"
        : severity === "MEDIUM"
          ? "bg-[#FCF0DC] text-[#B25E09]"
          : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{severity}</span>;
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




