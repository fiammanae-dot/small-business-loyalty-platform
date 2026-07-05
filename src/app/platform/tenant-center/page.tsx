import Link from "next/link";
import type { ReactNode } from "react";
import type { ActivityAlertStatus, Prisma, RecordStatus, SubscriptionStatus } from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { ActionMenu, ActionMenuItem } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";

type TenantParams = {
  q?: string;
  status?: string;
  plan?: string;
  health?: string;
};

type TenantRecord = Prisma.BusinessGetPayload<{
  include: {
    branches: { select: { id: true; name: true; status: true } };
    users: { select: { id: true; name: true; email: true; role: true; status: true } };
    customerMemberships: { select: { id: true } };
    loyaltyPrograms: { select: { id: true; active: true } };
    scanEvents: { select: { id: true } };
    activityAlerts: { select: { id: true; status: true } };
    subscriptions: { include: { subscriptionPlan: true } };
  };
}>;

type DecoratedTenant = TenantRecord & {
  ownerName: string;
  ownerEmail: string;
  planName: string;
  subscriptionStatus: SubscriptionStatus | "UNASSIGNED";
  tenantHealth: "Healthy" | "Attention Needed" | "At Risk";
  healthReasons: string[];
};

const activeAlertStatuses: ActivityAlertStatus[] = ["OPEN", "ASSIGNED", "UNDER_REVIEW", "ESCALATED"];

export default async function PlatformTenantCenterPage({
  searchParams,
}: {
  searchParams: Promise<TenantParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const now = new Date();

  const [businesses, plans, totalCustomers] = await Promise.all([
    prisma.business.findMany({
      include: {
        branches: { select: { id: true, name: true, status: true }, orderBy: { name: "asc" } },
        users: { select: { id: true, name: true, email: true, role: true, status: true }, orderBy: { createdAt: "asc" } },
        customerMemberships: { select: { id: true } },
        loyaltyPrograms: { select: { id: true, active: true } },
        scanEvents: { select: { id: true } },
        activityAlerts: { where: { status: { in: activeAlertStatuses } }, select: { id: true, status: true } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { subscriptionPlan: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriptionPlan.findMany({ orderBy: { maxBranches: "asc" } }),
    prisma.globalCustomer.count(),
  ]);

  const tenants = businesses.map((business) => decorateTenant(business, now));
  const filteredTenants = tenants.filter((tenant) => matchesTenantFilters(tenant, params));
  const activeTenants = tenants.filter((tenant) => tenant.status === "ACTIVE");
  const trialTenants = tenants.filter((tenant) => tenant.subscriptionStatus === "TRIAL");
  const suspendedTenants = tenants.filter((tenant) => tenant.subscriptionStatus === "SUSPENDED");
  const expiredTenants = tenants.filter((tenant) => tenant.subscriptionStatus === "EXPIRED");
  const activeFilterCount = [params.q, params.status, params.plan, params.health].filter(Boolean).length;
  const exportQuery = buildTenantExportQuery(params);

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Tenant Center">
      <PlatformKpiGrid className="md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} label="Total Tenants" value={tenants.length.toString()} href="/platform/tenant-center" />
        <KpiCard icon={CheckCircle2} label="Active Tenants" value={activeTenants.length.toString()} tone="success" href="/platform/tenant-center?status=ACTIVE" />
        <KpiCard icon={Activity} label="Trial Tenants" value={trialTenants.length.toString()} href="/platform/tenant-center?status=TRIAL" />
        <KpiCard icon={AlertTriangle} label="Suspended Tenants" value={suspendedTenants.length.toString()} tone={suspendedTenants.length > 0 ? "danger" : "default"} href="/platform/tenant-center?status=SUSPENDED" />
        <KpiCard icon={AlertTriangle} label="Expired Tenants" value={expiredTenants.length.toString()} tone={expiredTenants.length > 0 ? "danger" : "default"} href="/platform/tenant-center?status=EXPIRED" />
        <KpiCard icon={Users} label="Total Customers Across Platform" value={totalCustomers.toString()} href="/platform/tenant-center" />
      </PlatformKpiGrid>

        <MobileFilterDrawer activeCount={activeFilterCount}>
      <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
            <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Tenant filters</h2>
            <span className="text-sm text-[#9CA3AF]">· {filteredTenants.length} shown</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton href={`/platform/tenant-center/export?${exportQuery}&format=csv`} icon={<Download className="h-4 w-4" />} label="CSV" />
            <ExportButton href={`/platform/tenant-center/export?${exportQuery}&format=excel`} icon={<FileSpreadsheet className="h-4 w-4" />} label="Excel" />
            <ExportButton href={`/platform/tenant-center/export?${exportQuery}&format=pdf`} icon={<FileText className="h-4 w-4" />} label="PDF" />
          </div>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="status" value={params.status ?? ""} />
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">Search tenants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
            <input name="q" defaultValue={params.q ?? ""} placeholder="Search business, owner, or plan" className="h-10 w-full rounded-md border border-[#E5E7EB] pl-9 pr-3 text-sm" />
          </label>
          <SearchableCombobox
            label="Plan"
            name="plan"
            defaultValue={params.plan ?? ""}
            placeholder="All plans"
            emptyLabel="No plans found."
            options={[
              { value: "", label: "All plans", description: "Show tenants on every plan" },
              ...plans.map((plan) => ({ value: plan.name, label: plan.name, description: "Subscription plan" })),
            ]}
          />
          <select name="health" defaultValue={params.health ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
            <option value="">All health scores</option>
            <option value="Healthy">Healthy</option>
            <option value="Attention Needed">Attention Needed</option>
            <option value="At Risk">At Risk</option>
          </select>
          <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">Apply</button>
          <Link href="/platform/tenant-center" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">Clear</Link>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { value: "", label: "All" },
            { value: "ACTIVE", label: "Active" },
            { value: "TRIAL", label: "Trial" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "EXPIRED", label: "Expired" },
          ].map((option) => {
            const active = (params.status ?? "") === option.value;
            return (
              <Link key={option.value || "all"} href={buildTenantHref(params, { status: option.value })} className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition ${active ? "bg-[#F97316] text-white" : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#F97316] hover:text-[#F97316]"}`}>
                {option.label}
              </Link>
            );
          })}
        </div>
      </section>
        </MobileFilterDrawer>

      <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
            <h2 className="text-base font-bold tracking-tight text-[#171A21]">Tenants</h2>
          </div>
          <span className="text-sm font-semibold text-[#9CA3AF]">{filteredTenants.length} shown</span>
        </div>
        {filteredTenants.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredTenants.map((tenant) => <TenantCard key={tenant.uuid} tenant={tenant} />)}
          </div>
        ) : (
          <div className="mt-4"><EmptyState text="No tenants match these filters." /></div>
        )}
      </section>

    </DashboardShell>
  );
}

function decorateTenant(business: TenantRecord, now: Date): DecoratedTenant {
  const owner = business.users.find((user) => user.role === "BUSINESS_OWNER");
  const subscription = business.subscriptions[0];
  const inactiveStaff = business.users.filter((user) => user.role !== "BUSINESS_OWNER" && user.status === "INACTIVE").length;
  const expiredTrial = subscription?.status === "TRIAL" && subscription.trialEndDate !== null && subscription.trialEndDate < now;
  const openAlerts = business.activityAlerts.length;
  const healthReasons: string[] = [];

  if (subscription?.status === "SUSPENDED" || subscription?.status === "EXPIRED" || subscription?.status === "CANCELLED") healthReasons.push(`Subscription ${titleCase(subscription.status)}`);
  if (expiredTrial) healthReasons.push("Expired trial");
  if (inactiveStaff > 0) healthReasons.push(`${inactiveStaff} inactive staff`);
  if (openAlerts > 0) healthReasons.push(`${openAlerts} open alerts`);
  if (healthReasons.length === 0) healthReasons.push("No tenant health issues detected");

  const tenantHealth = getTenantHealth({ subscriptionStatus: subscription?.status, inactiveStaff, expiredTrial, openAlerts });
  return {
    ...business,
    ownerName: owner?.name ?? "Unassigned",
    ownerEmail: owner?.email ?? "No owner email",
    planName: subscription?.subscriptionPlan.name ?? "Unassigned",
    subscriptionStatus: subscription?.status ?? "UNASSIGNED",
    tenantHealth,
    healthReasons,
  };
}

function getTenantHealth({
  subscriptionStatus,
  inactiveStaff,
  expiredTrial,
  openAlerts,
}: {
  subscriptionStatus?: SubscriptionStatus;
  inactiveStaff: number;
  expiredTrial: boolean;
  openAlerts: number;
}): DecoratedTenant["tenantHealth"] {
  if (subscriptionStatus === "SUSPENDED" || subscriptionStatus === "EXPIRED" || subscriptionStatus === "CANCELLED" || expiredTrial || openAlerts >= 5) return "At Risk";
  if (subscriptionStatus === "TRIAL" || inactiveStaff > 0 || openAlerts > 0) return "Attention Needed";
  return "Healthy";
}

function matchesTenantFilters(tenant: DecoratedTenant, params: TenantParams) {
  const query = params.q?.trim().toLowerCase();
  if (query) {
    const haystack = [tenant.name, tenant.ownerName, tenant.ownerEmail, tenant.planName, businessTypeLabels[tenant.businessType]].join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (params.status) {
    if (params.status === "ACTIVE" || params.status === "INACTIVE") {
      if (tenant.status !== params.status) return false;
    } else if (tenant.subscriptionStatus !== params.status) {
      return false;
    }
  }
  if (params.plan && tenant.planName !== params.plan) return false;
  if (params.health && tenant.tenantHealth !== params.health) return false;
  return true;
}

function buildTenantExportQuery(params: TenantParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

function buildTenantHref(params: TenantParams, next: Partial<TenantParams>) {
  const merged = { ...params, ...next };
  const query = new URLSearchParams();
  if (merged.q) query.set("q", merged.q);
  if (merged.status) query.set("status", merged.status);
  if (merged.plan) query.set("plan", merged.plan);
  if (merged.health) query.set("health", merged.health);
  const qs = query.toString();
  return qs ? `/platform/tenant-center?${qs}` : "/platform/tenant-center";
}

function TenantCard({ tenant }: { tenant: DecoratedTenant }) {
  const healthAccent =
    tenant.tenantHealth === "At Risk"
      ? "border-l-red-500"
      : tenant.tenantHealth === "Attention Needed"
        ? "border-l-orange-500"
        : "border-l-emerald-500";
  const isActive = tenant.status === "ACTIVE";
  const subscriptionTone: "success" | "warn" | "neutral" =
    tenant.subscriptionStatus === "ACTIVE" ? "success" : tenant.subscriptionStatus === "UNASSIGNED" ? "neutral" : "warn";
  return (
    <article className={`min-w-0 rounded-xl border border-[#E7E9EE] border-l-[3px] ${healthAccent} bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-[#FEF0E6] text-[#F97316]" : "bg-[#F1EFE8] text-[#5F5E5A]"}`}>
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#111827]">{tenant.name}</p>
            <p className="truncate text-xs text-[#9CA3AF]">{businessTypeLabels[tenant.businessType]} · {tenant.planName}</p>
          </div>
        </div>
        <HealthBadge health={tenant.tenantHealth} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={tenant.status} />
        <SmallBadge label={`Subscription ${titleCase(tenant.subscriptionStatus)}`} tone={subscriptionTone} />
      </div>

      <p className="mt-2.5 truncate text-xs text-[#6B7280]">
        <span className="font-medium text-[#111827]">{tenant.ownerName}</span> · {tenant.ownerEmail}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile value={tenant.branches.length} label="Branches" />
        <StatTile value={tenant.loyaltyPrograms.length} label="Programs" />
        <StatTile value={tenant.customerMemberships.length} label="Customers" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F1F3F5] pt-3">
        <span className={`min-w-0 truncate text-xs ${tenant.tenantHealth === "Healthy" ? "text-[#9CA3AF]" : "text-[#B25E09]"}`}>{tenant.healthReasons[0]}</span>
        <div className="flex shrink-0 items-center gap-3">
          <ActionLink href={`/platform/businesses/${tenant.uuid}`} label="View" />
          <ActionLink href={`/platform/businesses/${tenant.uuid}/edit`} label="Edit" />
          <ActionMenu label="More tenant actions">
            <ActionMenuItem><Link href="/platform/subscriptions" className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">Suspend</Link></ActionMenuItem>
            <ActionMenuItem><Link href="/platform/subscriptions" className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">Activate</Link></ActionMenuItem>
            <ActionMenuItem><Link href="/platform/subscriptions" className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">Archive</Link></ActionMenuItem>
            <ActionMenuItem><Link href="/platform/users" className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">Transfer ownership</Link></ActionMenuItem>
          </ActionMenu>
        </div>
      </div>
    </article>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-[#FAFBFC] px-2 py-2 text-center">
      <p className="text-base font-semibold tabular-nums text-[#111827]">{value.toLocaleString()}</p>
      <p className="text-[11px] text-[#9CA3AF]">{label}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "default", href }: { icon: LucideIcon; label: string; value: string; tone?: "default" | "success" | "danger"; href?: string }) {
  const surfaceClass = tone === "danger" ? "bg-[#FCEBEB]" : tone === "success" ? "bg-[#EAF3DE]" : "bg-[#F8FAFC]";
  const labelClass = tone === "danger" ? "text-[#A32D2D]" : tone === "success" ? "text-[#3B6D11]" : "text-[#64748B]";
  const valueClass = tone === "danger" ? "text-[#A32D2D]" : tone === "success" ? "text-[#3B6D11]" : "text-[#111827]";
  const content = (
    <div className={`h-full rounded-lg p-3 transition ${surfaceClass} ${href ? "hover:brightness-[0.98]" : ""}`}>
      <p className={`flex items-center gap-1.5 text-xs font-medium ${labelClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </p>
      <p className={`mt-1.5 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );

  return href ? <Link href={href} className="block h-full cursor-pointer rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100">{content}</Link> : content;
}

function HealthBadge({ health }: { health: DecoratedTenant["tenantHealth"] }) {
  const classes = health === "At Risk" ? "bg-red-50 text-red-700" : health === "Attention Needed" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{health}</span>;
}

function StatusBadge({ status }: { status: RecordStatus }) {
  const classes = status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{titleCase(status)}</span>;
}

function SmallBadge({ label, tone }: { label: string; tone: "success" | "warn" | "neutral" }) {
  const classes = tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "warn" ? "bg-orange-50 text-orange-700" : "bg-zinc-100 text-zinc-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">{label}</Link>;
}

function ExportButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return <Link href={href} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]">{icon}{label}</Link>;
}


function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-center text-sm text-[#6B7280]">{text}</p>;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}




