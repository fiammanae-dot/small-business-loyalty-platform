import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  Database,
  FlaskConical,
  HeartPulse,
  Package,
  Plus,
  Receipt,
  Settings,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import packageJson from "../../../package.json";
import { DashboardShell } from "@/components/DashboardShell";
import { PlatformCards } from "@/components/PlatformCards";
import { formatDateTime } from "@/lib/format";
import { isDemoModeEnabled } from "@/lib/platform-settings";
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
    description: "Review environment, demo mode, and system controls.",
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
  const databaseName = getDatabaseName();
  const environmentName = getEnvironmentName(databaseName);
  const demoModeEnabled = await isDemoModeEnabled();

  const [
    totalBusinesses,
    newBusinessesThisMonth,
    activeSubscriptions,
    monthlyRevenue,
    openAlerts,
    failedLogins,
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
    prisma.failedLoginAudit.count({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, outcome: { in: ["FAILED", "LOCKED"] } } }),
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
      headerAside={
        <PlatformHealthCard
          environment={environmentName}
          database={databaseName}
          demoMode={demoModeEnabled}
          failedLogins24h={failedLogins}
          appVersion={packageJson.version ?? "Not Available"}
          systemStatus="Healthy"
        />
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={Building2} label="Total Businesses" value={totalBusinesses.toString()} trend={`${newBusinessesThisMonth} new this month`} />
        <KpiCard icon={CreditCard} label="Active Subscriptions" value={activeSubscriptions.toString()} />
        <KpiCard
          icon={Receipt}
          label="Monthly Revenue"
          value={revenueValue > 0 ? `AED ${revenueValue.toFixed(2)}` : "No revenue recorded yet"}
          trend={revenueValue > 0 ? "Current month" : undefined}
        />
        <KpiCard icon={ShieldAlert} label="Open Alerts" value={openAlerts.toString()} tone={openAlerts > 0 ? "alert" : "default"} href="/platform/health-analytics" />
        <KpiCard icon={Users} label="Total Customers" value={totalCustomers.toString()} trend={`${newCustomersThisMonth} new this month`} />
        <KpiCard icon={BarChart3} label="Total Programs" value={totalPrograms.toString()} trend={`${newProgramsThisMonth} new this month`} />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Quick Actions</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111827]">Common platform tasks</h2>
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
          <p className="text-sm font-semibold text-[#F97316]">Management</p>
          <h2 className="mt-1 text-lg font-semibold text-[#111827]">Primary operations</h2>
        </div>
        <PlatformCards cards={managementCards} />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Recent Activity</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111827]">Latest platform events</h2>
          </div>
          <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select name="activity" defaultValue={activityFilter} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
              <option value="all">All Activity</option>
              <option value="alerts">Alerts</option>
              <option value="invoices">Invoices</option>
              <option value="users">Users</option>
              <option value="subscriptions">Subscriptions</option>
            </select>
            <select name="date" defaultValue={dateFilter} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
            <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">Apply</button>
          </form>
        </div>
        <div className="mt-5 grid gap-3">
          {recentActivity.map((item, index) => (
            <div key={`${item.label}-${item.createdAt.toISOString()}-${index}`} className="flex gap-3 rounded-md border border-[#E5E7EB] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                    {item.severity ? <SeverityBadge severity={item.severity} /> : null}
                  </div>
                  <p className="text-xs text-[#6B7280]">{formatDateTime(item.createdAt)}</p>
                </div>
                <p className="mt-1 truncate text-sm text-[#111827]">{item.title}</p>
                <p className="mt-1 text-xs capitalize text-[#6B7280]">{item.meta}</p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">No platform activity matches these filters.</p> : null}
        </div>
      </section>

    </DashboardShell>
  );
}

function PlatformHealthCard({
  environment,
  database,
  demoMode,
  failedLogins24h,
  appVersion,
  systemStatus,
}: {
  environment: string;
  database: string;
  demoMode: boolean;
  failedLogins24h: number;
  appVersion: string;
  systemStatus: string;
}) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
          <HeartPulse className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111827]">Platform Health</p>
          <p className="text-xs font-semibold uppercase text-emerald-700">System Status: Healthy</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <ShellInfo icon={Activity} label="Environment" value={environment} />
        <ShellInfo icon={Database} label="Database" value={database} />
        <ShellInfo icon={FlaskConical} label="Demo Mode" value={demoMode ? "Enabled" : "Disabled"} />
        <ShellInfo icon={ShieldAlert} label="Failed Logins (24h)" value={failedLogins24h.toString()} />
        <ShellInfo icon={Package} label="App Version" value={appVersion} />
        <ShellInfo icon={HeartPulse} label="System Status" value={systemStatus} />
      </div>
    </div>
  );
}

function ShellInfo({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#FAFAFA] px-3 py-2">
      <span className="flex items-center gap-2 text-xs font-medium uppercase text-[#6B7280]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <span className="truncate text-right text-sm font-semibold text-[#111827]">{value}</span>
    </div>
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
    <div className={`h-full rounded-md border bg-white p-4 shadow-sm transition ${tone === "alert" ? "border-red-200" : "border-[#E5E7EB]"} ${href ? "hover:border-[#F97316]" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tone === "alert" ? "bg-red-50 text-red-600" : "bg-orange-50 text-[#F97316]"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 font-semibold text-[#111827] ${value.length > 12 ? "text-base leading-6" : "text-2xl"}`}>{value}</p>
      <p className="mt-2 text-xs font-medium text-[#6B7280]">{trend ?? "No trend data yet"}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-[#F97316] hover:text-[#F97316]">
      <Icon className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
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
          ? "bg-orange-50 text-orange-700"
          : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{severity}</span>;
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

function getDatabaseName() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return "Not Configured";
  try {
    return new URL(databaseUrl).pathname.replace("/", "") || "Unknown";
  } catch {
    return "Unknown";
  }
}

function getEnvironmentName(databaseName: string) {
  const configured = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV;
  if (configured) return toTitleCase(configured);
  if (databaseName === "loyalty_platform_pilot") return "Pilot";
  if (process.env.NODE_ENV === "production") return "Production";
  return "Development";
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
