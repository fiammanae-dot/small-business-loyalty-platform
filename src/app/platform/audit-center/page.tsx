import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  KeyRound,
  Search,
  ShieldAlert,
  UserCog,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { formatDateTime } from "@/lib/format";
import { roleLabels } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

type AuditSearchParams = {
  search?: string;
  eventType?: string;
  severity?: string;
  role?: string;
  business?: string;
  branch?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  event?: string;
  view?: string;
};

type AuditEventWithRelations = Prisma.AuditEventGetPayload<{
  include: {
    actorUser: { select: { name: true; email: true; role: true } };
    business: { select: { id: true; name: true } };
    branch: { select: { id: true; name: true } };
  };
}>;
type DecoratedAuditEvent = AuditEventWithRelations & {
  eventType: string;
  severity: AuditSeverity;
  status: AuditStatus;
  ipAddress: string;
};
type AuditSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type AuditStatus = "Success" | "Failed" | "Blocked";

const eventTypeOptions = [
  "Customer Actions",
  "Program Actions",
  "Business Actions",
  "Branch Actions",
  "User Actions",
  "Subscription Actions",
  "Invoice Actions",
  "Alert Actions",
  "Referral Actions",
  "Reward Actions",
  "Cooldown Actions",
  "Authentication Events",
  "Platform Settings Events",
  "Demo Mode Events",
  "Security Events",
];
const severityOptions: AuditSeverity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statusOptions: AuditStatus[] = ["Success", "Failed", "Blocked"];

export default async function PlatformAuditCenterPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRange = getDateRange(params, now);
  const businessId = params.business ? Number(params.business) : undefined;
  const branchId = params.branch ? Number(params.branch) : undefined;

  const [rawEvents, metricEvents, businesses, branches, selectedEvent] = await Promise.all([
    getAuditEvents({ search: params.search, businessId, branchId, from: dateRange.from, to: dateRange.to }),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { action: true, entityType: true, metadata: true, createdAt: true, businessId: true, actorUserId: true },
    }),
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({
      where: businessId ? { businessId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, business: { select: { name: true } } },
    }),
    params.event
      ? prisma.auditEvent.findUnique({
          where: { uuid: params.event },
          include: {
            actorUser: { select: { name: true, email: true, role: true } },
            business: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        })
      : null,
  ]);

  const decoratedEvents = rawEvents
    .map(decorateAuditEvent)
    .filter((event) => !params.eventType || event.eventType === params.eventType)
    .filter((event) => !params.severity || event.severity === params.severity)
    .filter((event) => !params.status || event.status === params.status)
    .filter((event) => !params.role || event.actorUser?.role === params.role)
    .slice(0, 100);
  const decoratedMetricEvents = metricEvents.map((event) => ({
    ...event,
    eventType: classifyEventType(event.action, event.entityType),
    severity: inferSeverity(event.action, event.metadata),
    status: inferStatus(event.action, event.metadata),
  }));
  const selectedDecoratedEvent = selectedEvent ? decorateAuditEvent(selectedEvent) : null;

  const totalAuditEvents = await prisma.auditEvent.count();
  const kpis = {
    total: totalAuditEvents,
    last24Hours: decoratedMetricEvents.filter((event) => event.createdAt >= last24Hours).length,
    security: decoratedMetricEvents.filter((event) => event.eventType === "Security Events" || event.eventType === "Authentication Events").length,
    administrative: decoratedMetricEvents.filter((event) => ["Platform Settings Events", "User Actions", "Business Actions"].includes(event.eventType)).length,
    business: decoratedMetricEvents.filter((event) => event.eventType === "Business Actions").length,
    subscription: decoratedMetricEvents.filter((event) => event.eventType === "Subscription Actions").length,
    cooldownOverrides: decoratedMetricEvents.filter((event) => event.action.includes("COOLDOWN") && event.action.includes("OVERRIDE")).length,
    failed: decoratedMetricEvents.filter((event) => event.status === "Failed" || event.status === "Blocked").length,
  };
  const securityCounts = {
    failedLoginAttempts: await prisma.failedLoginAudit.count({ where: { outcome: { in: ["FAILED", "LOCKED"] } } }),
    disabledAccountAttempts: decoratedMetricEvents.filter((event) => event.action.includes("DISABLED_ACCOUNT")).length,
    blockedActions: decoratedMetricEvents.filter((event) => event.status === "Blocked").length,
    cooldownViolations: decoratedMetricEvents.filter((event) => event.action.includes("COOLDOWN") && event.action.includes("VIOLATION")).length,
    cooldownOverrides: kpis.cooldownOverrides,
    demoModeViolations: decoratedMetricEvents.filter((event) => event.action === "DEMO_MODE_BLOCKED_ACTION").length,
    permissionViolations: decoratedMetricEvents.filter((event) => event.action.includes("PERMISSION")).length,
  };
  const activeQuery = buildQuery(params);
  const mostActiveBusinesses = summarizeBusinesses(decoratedMetricEvents, businesses);
  const mostActiveUsers = summarizeUsers(decoratedEvents);
  const eventsToday = decoratedMetricEvents.filter((event) => isSameUtcDay(event.createdAt, now));
  const activeFilterCount = Object.entries(params).filter(([key, value]) => !["event", "export", "view"].includes(key) && Boolean(value)).length;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Audit Center">
      <PlatformKpiGrid className="md:grid-cols-2 xl:grid-cols-4">
        <KpiLink icon={ClipboardList} label="Total Audit Events" value={kpis.total} href="/platform/audit-center" />
        <KpiLink icon={CalendarClock} label="Last 24 Hours Events" value={kpis.last24Hours} href="/platform/audit-center?date=today" />
        <KpiLink icon={ShieldAlert} label="Security Events" value={kpis.security} href="/platform/audit-center?eventType=Security+Events" tone="alert" />
        <KpiLink icon={UserCog} label="Administrative Changes" value={kpis.administrative} href="/platform/audit-center?eventType=Platform+Settings+Events" />
        <KpiLink icon={Building2} label="Business Actions" value={kpis.business} href="/platform/audit-center?eventType=Business+Actions" />
        <KpiLink icon={FileText} label="Subscription Actions" value={kpis.subscription} href="/platform/audit-center?eventType=Subscription+Actions" />
        <KpiLink icon={Activity} label="Cooldown Overrides" value={kpis.cooldownOverrides} href="/platform/audit-center?eventType=Cooldown+Actions" />
        <KpiLink icon={XCircle} label="Failed Actions" value={kpis.failed} href="/platform/audit-center?status=Failed" tone="alert" />
      </PlatformKpiGrid>

        <MobileFilterDrawer activeCount={activeFilterCount}>
      <section className="sticky top-0 z-10 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
          <h2 className="font-semibold text-[#111827]">Advanced Filters</h2>
        </div>
        <form className="grid gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <label className="relative lg:col-span-2">
            <span className="sr-only">Search audit events</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" aria-hidden="true" />
            <input name="search" defaultValue={params.search ?? ""} placeholder="Search user, business, email, event ID, entity ID" className="h-10 w-full rounded-md border border-[#E5E7EB] pl-9 pr-3 text-sm" />
          </label>
          <Select name="eventType" value={params.eventType} label="All event types" options={eventTypeOptions} />
          <Select name="severity" value={params.severity} label="All severities" options={severityOptions} />
          <Select name="role" value={params.role} label="All roles" options={Object.keys(roleLabels)} />
          <SearchableCombobox
            label="Business"
            name="business"
            defaultValue={params.business ?? ""}
            placeholder="All businesses"
            emptyLabel="No businesses found."
            options={[
              { value: "", label: "All businesses", description: "Show audit events from every business" },
              ...businesses.map((business) => ({ value: business.id.toString(), label: business.name, description: "Business" })),
            ]}
          />
          <SearchableCombobox
            label="Branch"
            name="branch"
            defaultValue={params.branch ?? ""}
            placeholder="All branches"
            emptyLabel="No branches found."
            options={[
              { value: "", label: "All branches", description: "Show audit events from every branch" },
              ...branches.map((branch) => ({ value: branch.id.toString(), label: branch.name, description: branch.business.name, badge: "Branch" })),
            ]}
          />
          <select name="date" defaultValue={params.date ?? "30d"} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <input type="date" name="from" defaultValue={params.from ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" />
          <input type="date" name="to" defaultValue={params.to ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" />
          <Select name="status" value={params.status} label="All statuses" options={statusOptions} />
          <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">Apply</button>
          <Link href="/platform/audit-center" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">Clear</Link>
        </form>
      </section>

        </MobileFilterDrawer>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Compliance Reporting</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111827]">Filtered audit exports</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <ExportButton href={`/platform/audit-center?${activeQuery}&export=csv`} icon={<Download className="h-4 w-4" />} label="Export CSV" />
            <ExportButton href={`/platform/audit-center?${activeQuery}&export=excel`} icon={<FileSpreadsheet className="h-4 w-4" />} label="Export Excel" />
            <ExportButton href={`/platform/audit-center?${activeQuery}&export=pdf`} icon={<FileText className="h-4 w-4" />} label="Export PDF" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Audit Event Table</h2>
              <p className="text-sm text-[#6B7280]">Showing {decoratedEvents.length} events</p>
            </div>
            <Link href={`/platform/audit-center?${activeQuery}&view=timeline`} className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#111827]">Timeline View</Link>
          </div>
          <div className="grid gap-3 md:hidden">
            {decoratedEvents.map((event) => (
              <AuditEventMobileCard key={event.id} event={event} activeQuery={activeQuery} />
            ))}
            {decoratedEvents.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-5 text-center">
                <p className="text-sm font-semibold text-[#111827]">No audit events found</p>
                <p className="mt-1 text-sm text-[#6B7280]">Try adjusting filters or clearing the current search.</p>
              </div>
            ) : null}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#6B7280]">
                  {["Date & Time", "Event Type", "Severity", "User", "Role", "Business", "Branch", "Entity", "Action", "Status", "IP Address", "Details"].map((heading) => (
                    <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decoratedEvents.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDateTime(event.createdAt)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{event.eventType}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4"><SeverityBadge severity={event.severity} /></td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.actorUser?.name ?? "System"}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.actorUser ? roleLabels[event.actorUser.role] : "-"}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.business?.name ?? "-"}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.branch?.name ?? "-"}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatAction(event.action)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4"><StatusBadge status={event.status} /></td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.ipAddress}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4">
                      <Link href={`/platform/audit-center?${activeQuery}&event=${event.uuid}`} className="font-semibold text-[#F97316]">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {decoratedEvents.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No audit events match these filters.</p> : null}
          </div>
        </div>

        <AuditDetailsDrawer event={selectedDecoratedEvent} />
      </section>

      {params.view === "timeline" ? (
        <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Audit Timeline View</h2>
          <div className="mt-5 grid gap-3">
            {decoratedEvents.map((event) => (
              <div key={event.uuid} className="grid gap-3 rounded-md border border-[#E5E7EB] p-3 sm:grid-cols-[90px_1fr]">
                <p className="text-sm font-semibold text-[#F97316]">{event.createdAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</p>
                <div>
                  <p className="font-semibold text-[#111827]">{formatAction(event.action)}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{event.eventType} - {event.business?.name ?? "Platform"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">Security Monitoring Section</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SecurityMetric icon={KeyRound} label="Failed Login Attempts" value={securityCounts.failedLoginAttempts} />
          <SecurityMetric icon={Ban} label="Disabled Account Attempts" value={securityCounts.disabledAccountAttempts} />
          <SecurityMetric icon={XCircle} label="Blocked Actions" value={securityCounts.blockedActions} />
          <SecurityMetric icon={AlertTriangle} label="Cooldown Violations" value={securityCounts.cooldownViolations} />
          <SecurityMetric icon={CheckCircle2} label="Cooldown Overrides" value={securityCounts.cooldownOverrides} />
          <SecurityMetric icon={ShieldAlert} label="Demo Mode Violations" value={securityCounts.demoModeViolations} />
          <SecurityMetric icon={ShieldAlert} label="Permission Violations" value={securityCounts.permissionViolations} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SummaryTable title="Most Active Businesses" columns={["Business", "Events", "Users", "Alerts", "Last Activity"]} rows={mostActiveBusinesses} />
        <SummaryTable title="Most Active Users" columns={["User", "Role", "Events", "Last Activity"]} rows={mostActiveUsers} />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">System Health Audit Panel</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <HealthMetric label="Last Audit Event" value={decoratedEvents[0] ? formatDateTime(decoratedEvents[0].createdAt) : "Not Available"} />
          <HealthMetric label="Events Today" value={eventsToday.length.toString()} />
          <HealthMetric label="Failed Events Today" value={eventsToday.filter((event) => event.status === "Failed").length.toString()} />
          <HealthMetric label="Security Events Today" value={eventsToday.filter((event) => event.eventType === "Security Events" || event.eventType === "Authentication Events").length.toString()} />
          <HealthMetric label="Critical Events Today" value={eventsToday.filter((event) => event.severity === "CRITICAL").length.toString()} />
        </div>
      </section>
    </DashboardShell>
  );
}

async function getAuditEvents({ search, businessId, branchId, from, to }: { search?: string; businessId?: number; branchId?: number; from: Date; to: Date }): Promise<AuditEventWithRelations[]> {
  const q = search?.trim();
  const searchFilters: Prisma.AuditEventWhereInput[] = q
    ? [
        ...(isUuid(q) ? [{ uuid: { equals: q } }] : []),
        { action: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { actorUser: { is: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } },
        { business: { is: { name: { contains: q, mode: "insensitive" } } } },
      ]
    : [];
  const events = await prisma.auditEvent.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      ...(businessId ? { businessId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(searchFilters.length > 0 ? { OR: searchFilters } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      actorUser: { select: { name: true, email: true, role: true } },
      business: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
  return events;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function decorateAuditEvent<T extends AuditEventWithRelations>(event: T): T & { eventType: string; severity: AuditSeverity; status: AuditStatus; ipAddress: string } {
  return {
    ...event,
    eventType: classifyEventType(event.action, event.entityType),
    severity: inferSeverity(event.action, event.metadata),
    status: inferStatus(event.action, event.metadata),
    ipAddress: getMetadataString(event.metadata, "ipAddress") ?? getMetadataString(event.metadata, "ip") ?? "Future-ready",
  };
}

function classifyEventType(action: string, entityType: string) {
  const value = `${action} ${entityType}`.toUpperCase();
  if (value.includes("CUSTOMER")) return "Customer Actions";
  if (value.includes("PROGRAM")) return "Program Actions";
  if (value.includes("BUSINESS")) return "Business Actions";
  if (value.includes("BRANCH")) return "Branch Actions";
  if (value.includes("USER") || value.includes("STAFF")) return "User Actions";
  if (value.includes("SUBSCRIPTION")) return "Subscription Actions";
  if (value.includes("INVOICE") || value.includes("PAYMENT")) return "Invoice Actions";
  if (value.includes("ALERT")) return "Alert Actions";
  if (value.includes("REFERRAL")) return "Referral Actions";
  if (value.includes("REWARD")) return "Reward Actions";
  if (value.includes("COOLDOWN")) return "Cooldown Actions";
  if (value.includes("LOGIN") || value.includes("AUTH")) return "Authentication Events";
  if (value.includes("DEMO_MODE")) return "Demo Mode Events";
  if (value.includes("SETTING") || value.includes("PLATFORM")) return "Platform Settings Events";
  if (value.includes("SECURITY") || value.includes("BLOCKED") || value.includes("PERMISSION")) return "Security Events";
  return "Administrative Changes";
}

function inferSeverity(action: string, metadata: unknown): AuditSeverity {
  const explicit = getMetadataString(metadata, "severity")?.toUpperCase();
  if (explicit && severityOptions.includes(explicit as AuditSeverity)) return explicit as AuditSeverity;
  if (action.includes("CRITICAL")) return "CRITICAL";
  if (action.includes("BLOCKED") || action.includes("PERMISSION") || action.includes("FAILED")) return "HIGH";
  if (action.includes("COOLDOWN") || action.includes("ALERT") || action.includes("DEMO_MODE")) return "MEDIUM";
  if (action.includes("UPDATED") || action.includes("CHANGED")) return "LOW";
  return "INFO";
}

function inferStatus(action: string, metadata: unknown): AuditStatus {
  const explicit = getMetadataString(metadata, "status") ?? getMetadataString(metadata, "result") ?? getMetadataString(metadata, "outcome");
  if (explicit?.toUpperCase().includes("BLOCK")) return "Blocked";
  if (explicit?.toUpperCase().includes("FAIL")) return "Failed";
  if (action.includes("BLOCKED")) return "Blocked";
  if (action.includes("FAILED")) return "Failed";
  return "Success";
}

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function getMetadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return (metadata as Record<string, unknown>)[key] ?? null;
}

function getDateRange(params: AuditSearchParams, now: Date) {
  if (params.date === "custom" && params.from && params.to) {
    return { from: new Date(`${params.from}T00:00:00.000Z`), to: new Date(`${params.to}T23:59:59.999Z`) };
  }
  const days = params.date === "today" ? 1 : params.date === "7d" ? 7 : 30;
  return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), to: now };
}

function buildQuery(params: AuditSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "event" && key !== "export") query.set(key, value);
  }
  return query.toString();
}

function formatAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isSameUtcDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function summarizeBusinesses(events: Array<{ businessId: number | null; business?: { id: number; name: string } | null; eventType?: string; createdAt: Date; actorUserId?: number | null }>, businesses: Array<{ id: number; name: string }>) {
  const names = new Map(businesses.map((business) => [business.id, business.name]));
  const groups = new Map<number, { events: number; users: Set<number>; alerts: number; last: Date }>();
  for (const event of events) {
    if (!event.businessId) continue;
    const group = groups.get(event.businessId) ?? { events: 0, users: new Set<number>(), alerts: 0, last: event.createdAt };
    group.events += 1;
    if (event.actorUserId) group.users.add(event.actorUserId);
    if (event.eventType === "Alert Actions") group.alerts += 1;
    if (event.createdAt > group.last) group.last = event.createdAt;
    groups.set(event.businessId, group);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].events - a[1].events)
    .slice(0, 10)
    .map(([businessId, group]) => [names.get(businessId) ?? `Business #${businessId}`, group.events.toString(), group.users.size.toString(), group.alerts.toString(), formatDateTime(group.last)]);
}

function summarizeUsers(events: DecoratedAuditEvent[]) {
  const groups = new Map<string, { name: string; role: string; events: number; last: Date }>();
  for (const event of events) {
    if (!event.actorUser) continue;
    const key = event.actorUser.email;
    const group = groups.get(key) ?? { name: event.actorUser.name, role: roleLabels[event.actorUser.role], events: 0, last: event.createdAt };
    group.events += 1;
    if (event.createdAt > group.last) group.last = event.createdAt;
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.events - a.events)
    .slice(0, 10)
    .map((group) => [group.name, group.role, group.events.toString(), formatDateTime(group.last)]);
}

function KpiLink({ icon: Icon, label, value, href, tone = "default" }: { icon: LucideIcon; label: string; value: number; href: string; tone?: "default" | "alert" }) {
  return (
    <Link href={href} className={`rounded-md border bg-white p-3 shadow-sm transition md:p-4 hover:border-[#F97316] ${tone === "alert" ? "border-red-200" : "border-[#E5E7EB]"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tone === "alert" ? "bg-red-50 text-red-600" : "bg-orange-50 text-[#F97316]"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#111827]">{value}</p>
    </Link>
  );
}

function Select({ name, value, label, options }: { name: string; value?: string; label: string; options: readonly string[] }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
      <option value="">{label}</option>
      {options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
    </select>
  );
}

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const classes = {
    INFO: "bg-zinc-100 text-zinc-700",
    LOW: "bg-emerald-50 text-emerald-700",
    MEDIUM: "bg-orange-50 text-orange-700",
    HIGH: "bg-red-50 text-red-700",
    CRITICAL: "bg-red-100 text-red-800",
  }[severity];
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: AuditStatus }) {
  const classes = status === "Blocked" ? "bg-red-50 text-red-700" : status === "Failed" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{status}</span>;
}

function AuditEventMobileCard({ event, activeQuery }: { event: DecoratedAuditEvent; activeQuery: string }) {
  const entity = `${event.entityType}${event.entityId ? ` #${event.entityId}` : ""}`;
  return (
    <article className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111827]">{event.eventType}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{formatDateTime(event.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <SeverityBadge severity={event.severity} />
          <StatusBadge status={event.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <MobileAuditDetail label="User" value={event.actorUser?.name ?? "System"} />
        <MobileAuditDetail label="Role" value={event.actorUser ? roleLabels[event.actorUser.role] : "-"} />
        <MobileAuditDetail label="Business" value={event.business?.name ?? "-"} />
        <MobileAuditDetail label="Branch" value={event.branch?.name ?? "-"} />
        <MobileAuditDetail label="Action" value={formatAction(event.action)} />
        <MobileAuditDetail label="Entity" value={entity} />
        <MobileAuditDetail label="IP Address" value={event.ipAddress} />
      </div>

      <Link
        href={`/platform/audit-center?${activeQuery}&event=${event.uuid}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
      >
        View Details
      </Link>
    </article>
  );
}

function MobileAuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2 rounded-md bg-[#FAFAFA] px-3 py-2">
      <span className="text-xs font-semibold uppercase text-[#6B7280]">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-[#111827]">{value}</span>
    </div>
  );
}

function AuditDetailsDrawer({ event }: { event: DecoratedAuditEvent | null }) {
  if (!event) {
    return (
      <aside className="rounded-md border border-dashed border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">Audit Event Details Drawer</h2>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">Select an event from the table to inspect metadata, before values, after values, and compliance context.</p>
      </aside>
    );
  }
  const beforeValue = getMetadataValue(event.metadata, "before") ?? getMetadataValue(event.metadata, "previousValue");
  const afterValue = getMetadataValue(event.metadata, "after") ?? getMetadataValue(event.metadata, "newValue");
  return (
    <aside className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
      <h2 className="text-lg font-semibold text-[#111827]">Audit Event Details Drawer</h2>
      <div className="mt-4 grid gap-2 text-sm">
        <Detail label="Event ID" value={event.uuid} />
        <Detail label="Timestamp" value={formatDateTime(event.createdAt)} />
        <Detail label="User" value={event.actorUser?.name ?? "System"} />
        <Detail label="Role" value={event.actorUser ? roleLabels[event.actorUser.role] : "-"} />
        <Detail label="Business" value={event.business?.name ?? "-"} />
        <Detail label="Branch" value={event.branch?.name ?? "-"} />
        <Detail label="Entity" value={`${event.entityType}${event.entityId ? ` #${event.entityId}` : ""}`} />
        <Detail label="Action" value={formatAction(event.action)} />
        <Detail label="Severity" value={event.severity} />
        <Detail label="Result" value={event.status} />
      </div>
      <MetadataBlock title="Before Value" value={beforeValue} />
      <MetadataBlock title="After Value" value={afterValue} />
      <MetadataBlock title="Metadata" value={event.metadata} />
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-md bg-[#FAFAFA] px-3 py-2">
      <span className="text-xs font-semibold uppercase text-[#6B7280]">{label}</span>
      <span className="break-all text-right font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function MetadataBlock({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-[#111827] p-3 text-xs leading-5 text-white">{JSON.stringify(value, null, 2)}</pre>
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

function SecurityMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#6B7280]">{label}</p>
        <Icon className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#111827]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7280]">Trend data uses current audit history.</p>
    </div>
  );
}

function SummaryTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-[#6B7280]">
              {columns.map((column) => <th key={column} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No activity summary available yet.</p> : null}
      </div>
    </section>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
