import Link from "next/link";
import type { ReactNode } from "react";
import type { ActivityAlertStatus, Prisma, RecordStatus, SubscriptionStatus } from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { formatDate } from "@/lib/format";
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
    branding: true;
    branches: { select: { id: true; name: true; status: true } };
    users: { select: { id: true; name: true; email: true; role: true; status: true } };
    customerMemberships: { select: { id: true } };
    loyaltyPrograms: { select: { id: true; active: true } };
    scanEvents: { select: { id: true } };
    activityAlerts: { select: { id: true; status: true } };
    subscriptions: { include: { subscriptionPlan: true } };
    auditEvents: { select: { id: true; action: true; entityType: true; createdAt: true } };
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
        branding: true,
        branches: { select: { id: true, name: true, status: true }, orderBy: { name: "asc" } },
        users: { select: { id: true, name: true, email: true, role: true, status: true }, orderBy: { createdAt: "asc" } },
        customerMemberships: { select: { id: true } },
        loyaltyPrograms: { select: { id: true, active: true } },
        scanEvents: { select: { id: true } },
        activityAlerts: { where: { status: { in: activeAlertStatuses } }, select: { id: true, status: true } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { subscriptionPlan: true } },
        auditEvents: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, action: true, entityType: true, createdAt: true } },
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

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Tenant Center">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} label="Total Tenants" value={tenants.length.toString()} />
        <KpiCard icon={CheckCircle2} label="Active Tenants" value={activeTenants.length.toString()} tone="success" />
        <KpiCard icon={Activity} label="Trial Tenants" value={trialTenants.length.toString()} />
        <KpiCard icon={AlertTriangle} label="Suspended Tenants" value={suspendedTenants.length.toString()} tone={suspendedTenants.length > 0 ? "danger" : "default"} />
        <KpiCard icon={AlertTriangle} label="Expired Tenants" value={expiredTenants.length.toString()} tone={expiredTenants.length > 0 ? "danger" : "default"} />
        <KpiCard icon={Users} label="Total Customers Across Platform" value={totalCustomers.toString()} />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
              <h2 className="font-semibold text-[#111827]">Tenant Directory Filters</h2>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">Showing {filteredTenants.length} tenants</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton href="/platform/tenant-center?export=csv" icon={<Download className="h-4 w-4" />} label="CSV" />
            <ExportButton href="/platform/tenant-center?export=excel" icon={<FileSpreadsheet className="h-4 w-4" />} label="Excel" />
            <ExportButton href="/platform/tenant-center?export=pdf" icon={<FileText className="h-4 w-4" />} label="PDF" />
          </div>
        </div>
        <form className="grid gap-3 lg:grid-cols-4">
          <label className="relative lg:col-span-2">
            <span className="sr-only">Search tenants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" aria-hidden="true" />
            <input name="q" defaultValue={params.q ?? ""} placeholder="Search business, owner, or plan" className="h-10 w-full rounded-md border border-[#E5E7EB] pl-9 pr-3 text-sm" />
          </label>
          <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>
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
          <Link href="/platform/tenant-center" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">Clear Filters</Link>
        </form>
      </section>

      <Panel title="Tenant Directory" icon={Building2}>
        <TenantDirectory tenants={filteredTenants} />
      </Panel>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Tenant Health Score" icon={ShieldCheck}>
          <div className="grid gap-3">
            {filteredTenants.slice(0, 8).map((tenant) => (
              <div key={tenant.uuid} className="rounded-md border border-[#E5E7EB] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#111827]">{tenant.name}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">{tenant.healthReasons.join(", ")}</p>
                  </div>
                  <HealthBadge health={tenant.tenantHealth} />
                </div>
              </div>
            ))}
            {filteredTenants.length === 0 ? <EmptyState text="No tenants match these filters." /> : null}
          </div>
        </Panel>

        <Panel title="Tenant Branding" icon={Palette}>
          <div className="grid gap-3">
            {filteredTenants.slice(0, 6).map((tenant) => (
              <div key={tenant.uuid} className="rounded-md border border-[#E5E7EB] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#111827]">{tenant.name}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">Brand Name: {tenant.name}</p>
                  </div>
                  <Link href={`/platform/businesses/${tenant.uuid}/edit`} className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] px-2 py-1 text-xs font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
                    Edit
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <ConfigLine label="Business Logo" value={tenant.branding?.logoUrl ? "Configured" : "Not configured"} />
                  <ColorLine label="Primary Color" value={tenant.branding?.primaryColor ?? "#F97316"} />
                  <ColorLine label="Secondary Color" value={tenant.branding?.secondaryColor ?? "#FDBA74"} />
                  <ColorLine label="Button Color" value={tenant.branding?.buttonColor ?? "#F97316"} />
                  <ConfigLine label="Customer Card Branding" value="Uses saved business branding" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Customer Experience Branding" icon={Palette}>
          <div className="grid gap-2">
            <ConfigLine label="Customer Card" value="Uses saved business branding" />
            <ConfigLine label="QR Page" value="Uses saved business branding" />
            <ConfigLine label="Reward Page" value="Uses saved business branding" />
            <ConfigLine label="Enrollment Page" value="Uses saved business branding" />
            <ConfigLine label="Referral Page" value="Uses saved business branding" />
          </div>
        </Panel>

        <Panel title="Tenant Settings" icon={Settings}>
          <div className="grid gap-2">
            <ConfigLine label="Allow referrals" value="Enabled by platform policy" />
            <ConfigLine label="Allow rewards" value="Enabled by platform policy" />
            <ConfigLine label="Allow QR scans" value="Enabled by platform policy" />
            <ConfigLine label="Allow messaging" value="Prepared-message mode" />
          </div>
        </Panel>
      </section>

      <section>
        <Panel title="Tenant Resource Monitoring" icon={Activity}>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredTenants.slice(0, 10).map((tenant) => (
              <div key={tenant.uuid} className="rounded-md border border-[#E5E7EB] p-3">
                <p className="font-semibold text-[#111827]">{tenant.name}</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <MetricLine label="Customers" value={tenant.customerMemberships.length.toString()} />
                  <MetricLine label="Programs" value={tenant.loyaltyPrograms.length.toString()} />
                  <MetricLine label="Branches" value={tenant.branches.length.toString()} />
                  <MetricLine label="Users" value={tenant.users.length.toString()} />
                  <MetricLine label="QR Scans" value={tenant.scanEvents.length.toString()} />
                  <MetricLine label="Enrollments" value={tenant.customerMemberships.length.toString()} />
                  <MetricLine label="Storage Usage" value="0 MB tracked" />
                  <MetricLine label="Database Usage" value="Shared database" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Tenant Audit History" icon={FileText}>
        <div className="mb-4 grid gap-2 text-sm md:grid-cols-3 xl:grid-cols-6">
          {["Brand changes", "Plan changes", "Subscription changes", "Owner changes", "Status changes", "Billing changes"].map((label) => (
            <div key={label} className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 font-semibold text-[#6B7280]">{label}</div>
          ))}
        </div>
        <div className="grid gap-3">
          {filteredTenants.flatMap((tenant) => tenant.auditEvents.map((event) => ({ tenant, event }))).slice(0, 12).map(({ tenant, event }) => (
            <div key={`${tenant.uuid}-${event.id}`} className="rounded-md border border-[#E5E7EB] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#111827]">{formatAction(event.action)}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{tenant.name} - {event.entityType}</p>
                </div>
                <p className="text-sm text-[#6B7280]">{formatDate(event.createdAt)}</p>
              </div>
            </div>
          ))}
          {filteredTenants.every((tenant) => tenant.auditEvents.length === 0) ? <EmptyState text="No tenant audit history is available yet." /> : null}
        </div>
      </Panel>
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

function TenantDirectory({ tenants }: { tenants: DecoratedTenant[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-[#6B7280]">
              {["Business Name", "Owner", "Plan", "Status", "Branches", "Programs", "Customers", "Created Date", "Tenant Health Score", "Actions"].map((heading) => (
                <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.uuid} className="align-top">
                <td className="border-b border-[#E5E7EB] px-3 py-4">
                  <p className="font-semibold text-[#111827]">{tenant.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{businessTypeLabels[tenant.businessType]}</p>
                </td>
                <td className="border-b border-[#E5E7EB] px-3 py-4">
                  <p className="font-semibold text-[#111827]">{tenant.ownerName}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{tenant.ownerEmail}</p>
                </td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{tenant.planName}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4">
                  <div className="flex flex-col gap-2">
                    <StatusBadge status={tenant.status} />
                    <SmallBadge label={titleCase(tenant.subscriptionStatus)} tone={tenant.subscriptionStatus === "ACTIVE" ? "success" : tenant.subscriptionStatus === "UNASSIGNED" ? "neutral" : "warn"} />
                  </div>
                </td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{tenant.branches.length}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{tenant.loyaltyPrograms.length}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{tenant.customerMemberships.length}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(tenant.createdAt)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4"><HealthBadge health={tenant.tenantHealth} /></td>
                <td className="border-b border-[#E5E7EB] px-3 py-4">
                  <div className="flex flex-wrap gap-2">
                    <ActionLink href={`/platform/businesses/${tenant.uuid}`} label="View" />
                    <ActionLink href={`/platform/businesses/${tenant.uuid}/edit`} label="Edit" />
                    <ActionLink href="/platform/subscriptions" label="Suspend" />
                    <ActionLink href="/platform/subscriptions" label="Activate" />
                    <ActionLink href="/platform/subscriptions" label="Archive" />
                    <ActionLink href="/platform/users" label="Transfer Ownership" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tenants.length === 0 ? <EmptyState text="No tenants match these filters." /> : null}
      </div>

      <div className="grid gap-3 lg:hidden">
        {tenants.map((tenant) => (
          <div key={tenant.uuid} className="rounded-md border border-[#E5E7EB] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#111827]">{tenant.name}</p>
                <p className="mt-1 text-sm text-[#6B7280]">{businessTypeLabels[tenant.businessType]}</p>
              </div>
              <HealthBadge health={tenant.tenantHealth} />
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <MetricLine label="Owner" value={tenant.ownerName} />
              <MetricLine label="Plan" value={tenant.planName} />
              <MetricLine label="Status" value={titleCase(tenant.status)} />
              <MetricLine label="Branches" value={tenant.branches.length.toString()} />
              <MetricLine label="Programs" value={tenant.loyaltyPrograms.length.toString()} />
              <MetricLine label="Customers" value={tenant.customerMemberships.length.toString()} />
              <MetricLine label="Created Date" value={formatDate(tenant.createdAt)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionLink href={`/platform/businesses/${tenant.uuid}`} label="View" />
              <ActionLink href={`/platform/businesses/${tenant.uuid}/edit`} label="Edit" />
              <ActionLink href="/platform/subscriptions" label="Suspend" />
              <ActionLink href="/platform/subscriptions" label="Activate" />
              <ActionLink href="/platform/subscriptions" label="Archive" />
              <ActionLink href="/platform/users" label="Transfer Ownership" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "default" }: { icon: LucideIcon; label: string; value: string; tone?: "default" | "success" | "danger" }) {
  const iconClass = tone === "danger" ? "bg-red-50 text-red-600" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-[#F97316]";
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${iconClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
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

function ConfigLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#FAFAFA] px-3 py-2">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span className="text-right text-sm font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function ColorLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#FAFAFA] px-3 py-2">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827]">
        <span className="h-4 w-4 rounded-full border border-[#E5E7EB]" style={{ backgroundColor: value }} />
        {value}
      </span>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-[#6B7280]">{label}</span><strong className="text-right text-[#111827]">{value}</strong></div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-center text-sm text-[#6B7280]">{text}</p>;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAction(value: string) {
  return titleCase(value);
}
