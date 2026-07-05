import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronDown, Download, FileSpreadsheet, FileText, Search, X } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { EmptyState } from "@/components/ui/EmptyState";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  "Restricted Action Events",
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
    compliance: decoratedMetricEvents.filter((event) => event.action === "POSSIBLE_MULTI_BRANCH_USAGE").length,
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
  const hasMoreFilters = Boolean(
    params.eventType || params.severity || params.status || params.role || params.business || params.branch || params.from || params.to,
  );
  const eventGroups = groupEventsByDay(decoratedEvents, now);

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Audit Center">
      <MobileFilterDrawer activeCount={activeFilterCount}>
        <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <form className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_170px_auto_auto]">
            <label className="relative">
              <span className="sr-only">Search audit events</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8091]" aria-hidden="true" />
              <input
                name="search"
                defaultValue={params.search ?? ""}
                placeholder="Search user, business, email, event ID, entity ID"
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              />
            </label>
            <label>
              <span className="sr-only">Date range</span>
              <select
                name="date"
                defaultValue={params.date ?? "30d"}
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href="/platform/audit-center"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>

            <details className="lg:col-span-full" open={hasMoreFilters}>
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-[var(--medium-gray)] px-4 py-2 text-sm font-semibold text-[#171A21] transition hover:bg-[var(--light-gray)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <span>
                  More filters
                  {hasMoreFilters ? (
                    <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-deep)]">active</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-[#7A8091]">
                  Event type, severity, status, role, business, branch, custom dates
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <FilterSelect name="eventType" value={params.eventType} label="All event types" options={eventTypeOptions} />
                <FilterSelect name="severity" value={params.severity} label="All severities" options={severityOptions} />
                <FilterSelect name="status" value={params.status} label="All statuses" options={statusOptions} />
                <FilterSelect name="role" value={params.role} label="All roles" options={Object.keys(roleLabels)} />
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
                <label>
                  <span className="sr-only">Custom range start date</span>
                  <input type="date" name="from" defaultValue={params.from ?? ""} className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
                </label>
                <label>
                  <span className="sr-only">Custom range end date</span>
                  <input type="date" name="to" defaultValue={params.to ?? ""} className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
                </label>
              </div>
            </details>
          </form>

          <div className="mt-3 flex justify-end border-t border-[var(--light-gray)] pt-3">
            <details className="relative">
              <summary
                className="inline-flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export filtered
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 grid min-w-44 gap-1 rounded-lg border border-[var(--medium-gray)] bg-white p-1.5 shadow-xl">
                <ExportItem href={`/platform/audit-center/export?${activeQuery}&format=csv`} icon={<Download className="h-4 w-4" aria-hidden="true" />} label="Export CSV" />
                <ExportItem href={`/platform/audit-center/export?${activeQuery}&format=excel`} icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />} label="Export Excel" />
                <ExportItem href={`/platform/audit-center/export?${activeQuery}&format=pdf`} icon={<FileText className="h-4 w-4" aria-hidden="true" />} label="Export PDF" />
              </div>
            </details>
          </div>
        </div>
      </MobileFilterDrawer>

      <nav aria-label="Audit summary" className="flex flex-wrap items-center gap-1.5">
        <StatPill href="/platform/audit-center" value={kpis.total} label="total" />
        <StatPill href="/platform/audit-center?date=today" value={kpis.last24Hours} label="last 24h" />
        <StatPill href="/platform/audit-center?eventType=Security+Events" value={kpis.security} label="security" tone="danger" />
        <StatPill href="/platform/audit-center?eventType=Platform+Settings+Events" value={kpis.administrative} label="administrative" />
        <StatPill href="/platform/audit-center?eventType=Business+Actions" value={kpis.business} label="business" />
        <StatPill href="/platform/audit-center?eventType=Subscription+Actions" value={kpis.subscription} label="subscription" />
        <StatPill href="/platform/audit-center?eventType=Cooldown+Actions" value={kpis.cooldownOverrides} label="cooldown overrides" />
        <StatPill href="/platform/audit-center?status=Failed" value={kpis.failed} label="failed" tone="danger" />
        <StatPill href="/platform/audit-center?eventType=Compliance+Events" value={kpis.compliance} label="compliance" tone={kpis.compliance > 0 ? "warning" : "default"} />
      </nav>

      <section aria-label="Audit events" className={`grid gap-3 ${selectedDecoratedEvent ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
        <div className="overflow-hidden rounded-xl border border-[var(--medium-gray)] bg-white shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--medium-gray)] px-4 py-3">
            <h2 className="text-sm font-bold tracking-tight text-[#171A21]">
              Event stream <span className="font-medium text-[#7A8091]">· {decoratedEvents.length} events</span>
            </h2>
            <p className="hidden text-xs text-[#7A8091] sm:block">Select an event to inspect metadata</p>
          </div>
          {eventGroups.map((group) => (
            <div key={group.label}>
              <p className="bg-[var(--app-canvas)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#7A8091]">{group.label}</p>
              {group.events.map((event) => {
                const selected = event.uuid === params.event;
                return (
                  <Link
                    key={event.uuid}
                    href={`/platform/audit-center?${activeQuery}${activeQuery ? "&" : ""}event=${event.uuid}`}
                    aria-current={selected ? "true" : undefined}
                    className={`block border-b border-[var(--light-gray)] px-4 py-2.5 transition last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
                      selected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--app-canvas)]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-10 shrink-0 text-xs tabular-nums text-[#7A8091]">
                        {event.createdAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </span>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${severityDot(event.severity)}`} title={event.severity} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#171A21]">{formatAction(event.action)}</span>
                      <AuditStatusBadge status={event.status} />
                    </span>
                    <span className="mt-1 block truncate pl-[50px] text-xs text-[#7A8091]">
                      {event.actorUser ? `${event.actorUser.name} (${roleLabels[event.actorUser.role]})` : "System"}
                      {event.business ? ` · ${event.business.name}` : ""}
                      {event.branch ? ` → ${event.branch.name}` : ""}
                      {" · "}
                      {event.entityType}
                      {event.entityId ? ` #${event.entityId}` : ""}
                      {" · "}
                      {event.ipAddress}
                    </span>
                    <span className="sr-only">Severity {event.severity}. Event type {event.eventType}. View details.</span>
                  </Link>
                );
              })}
            </div>
          ))}
          {decoratedEvents.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No audit events found"
                description="Try adjusting filters or clearing the current search."
                action={
                  <Link
                    href="/platform/audit-center"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Clear filters
                  </Link>
                }
              />
            </div>
          ) : null}
        </div>

        {selectedDecoratedEvent ? <AuditDetailsPanel event={selectedDecoratedEvent} activeQuery={activeQuery} /> : null}
      </section>

      <section aria-label="Security and activity summaries" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Security &amp; health</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <MonitorRow label="Failed login attempts" value={securityCounts.failedLoginAttempts} tone={securityCounts.failedLoginAttempts > 0 ? "danger" : "ok"} />
            <MonitorRow label="Disabled account attempts" value={securityCounts.disabledAccountAttempts} tone={securityCounts.disabledAccountAttempts > 0 ? "warning" : "ok"} />
            <MonitorRow label="Blocked actions" value={securityCounts.blockedActions} tone={securityCounts.blockedActions > 0 ? "warning" : "ok"} />
            <MonitorRow label="Cooldown violations" value={securityCounts.cooldownViolations} tone={securityCounts.cooldownViolations > 0 ? "warning" : "ok"} />
            <MonitorRow label="Cooldown overrides" value={securityCounts.cooldownOverrides} tone="neutral" />
            <MonitorRow label="Restricted action attempts" value={securityCounts.demoModeViolations} tone={securityCounts.demoModeViolations > 0 ? "warning" : "ok"} />
            <MonitorRow label="Permission violations" value={securityCounts.permissionViolations} tone={securityCounts.permissionViolations > 0 ? "danger" : "ok"} />
            <div className="border-t border-[var(--medium-gray)] pt-2.5 text-xs text-[#7A8091]">
              <p>
                Today:{" "}
                <span className="font-semibold text-[#171A21]">
                  {eventsToday.length} events · {eventsToday.filter((event) => event.status === "Failed").length} failed ·{" "}
                  {eventsToday.filter((event) => event.eventType === "Security Events" || event.eventType === "Authentication Events").length} security ·{" "}
                  {eventsToday.filter((event) => event.severity === "CRITICAL").length} critical
                </span>
              </p>
              <p className="mt-1">
                Last audit event:{" "}
                <span className="font-semibold text-[#171A21]">{decoratedEvents[0] ? formatDateTime(decoratedEvents[0].createdAt) : "Not available"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Most active businesses</h2>
          <div className="mt-3 grid gap-2.5">
            {mostActiveBusinesses.map((row, index) => (
              <div key={`${row.name}-${index}`} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className={`text-sm font-bold tabular-nums ${index < 3 ? "text-[var(--accent-deep)]" : "text-[#9AA0AD]"}`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#171A21]">{row.name}</p>
                  <p className="truncate text-[#7A8091]">
                    {row.users} {row.users === "1" ? "user" : "users"} · {row.alerts} {row.alerts === "1" ? "alert" : "alerts"} · {row.last}
                  </p>
                </div>
                <span className="font-semibold tabular-nums text-[#3D4352]">{row.events}</span>
              </div>
            ))}
            {mostActiveBusinesses.length === 0 ? <p className="rounded-lg border border-dashed border-[#D8DBE2] bg-[var(--app-canvas)] p-3 text-sm text-[#7A8091]">No activity summary available yet.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Most active users</h2>
          <div className="mt-3 grid gap-2.5">
            {mostActiveUsers.map((row, index) => (
              <div key={`${row.name}-${index}`} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className={`text-sm font-bold tabular-nums ${index < 3 ? "text-[var(--accent-deep)]" : "text-[#9AA0AD]"}`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#171A21]">{row.name}</p>
                  <p className="truncate text-[#7A8091]">{row.role} · {row.last}</p>
                </div>
                <span className="font-semibold tabular-nums text-[#3D4352]">{row.events}</span>
              </div>
            ))}
            {mostActiveUsers.length === 0 ? <p className="rounded-lg border border-dashed border-[#D8DBE2] bg-[var(--app-canvas)] p-3 text-sm text-[#7A8091]">No activity summary available yet.</p> : null}
          </div>
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
    ipAddress: getMetadataString(event.metadata, "ipAddress") ?? getMetadataString(event.metadata, "ip") ?? "Not recorded",
  };
}

function classifyEventType(action: string, entityType: string) {
  const value = `${action} ${entityType}`.toUpperCase();
  if (value.includes("POSSIBLE_MULTI_BRANCH_USAGE") || value.includes("COMPLIANCE")) return "Compliance Events";
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
  if (value.includes("DEMO_MODE")) return "Restricted Action Events";
  if (value.includes("SETTING") || value.includes("PLATFORM")) return "Platform Settings Events";
  if (value.includes("SECURITY") || value.includes("BLOCKED") || value.includes("PERMISSION")) return "Security Events";
  return "Administrative Changes";
}

function inferSeverity(action: string, metadata: unknown): AuditSeverity {
  const explicit = getMetadataString(metadata, "severity")?.toUpperCase();
  if (explicit && severityOptions.includes(explicit as AuditSeverity)) return explicit as AuditSeverity;
  if (action.includes("CRITICAL")) return "CRITICAL";
  if (action.includes("BLOCKED") || action.includes("PERMISSION") || action.includes("FAILED")) return "HIGH";
  if (action.includes("POSSIBLE_MULTI_BRANCH_USAGE") || action.includes("COOLDOWN") || action.includes("ALERT") || action.includes("DEMO_MODE")) return "MEDIUM";
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

function groupEventsByDay(events: DecoratedAuditEvent[], now: Date) {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const groups: Array<{ label: string; events: DecoratedAuditEvent[] }> = [];

  for (const event of events) {
    const label = isSameUtcDay(event.createdAt, now)
      ? `Today · ${event.createdAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`
      : isSameUtcDay(event.createdAt, yesterday)
        ? `Yesterday · ${event.createdAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`
        : event.createdAt.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
    const current = groups[groups.length - 1];
    if (current && current.label === label) {
      current.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return groups;
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
    .map(([businessId, group]) => ({
      name: names.get(businessId) ?? `Business #${businessId}`,
      events: group.events.toString(),
      users: group.users.size.toString(),
      alerts: group.alerts.toString(),
      last: formatDateTime(group.last),
    }));
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
    .map((group) => ({ name: group.name, role: group.role, events: group.events.toString(), last: formatDateTime(group.last) }));
}

function severityDot(severity: AuditSeverity) {
  if (severity === "CRITICAL" || severity === "HIGH") return "bg-[#E24B4A]";
  if (severity === "MEDIUM") return "bg-[#EF9F27]";
  if (severity === "LOW") return "bg-[#1D9E75]";
  return "bg-[#888780]";
}

function StatPill({ href, value, label, tone = "default" }: { href: string; value: number; label: string; tone?: "default" | "danger" | "warning" }) {
  const toneClasses =
    tone === "danger"
      ? "border-[#F7C1C1] bg-[#FCEBEB] text-[#A32D2D] hover:border-[#F09595]"
      : tone === "warning"
        ? "border-[#F3D9A4] bg-[#FFFBF2] text-[#854F0B] hover:border-[#FAC775]"
        : "border-[var(--medium-gray)] bg-white text-[#3D4352] hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)]";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${toneClasses}`}
    >
      <span className="font-bold tabular-nums">{value.toLocaleString("en-US")}</span>
      {label}
    </Link>
  );
}

function FilterSelect({ name, value, label, options }: { name: string; value?: string; label: string; options: readonly string[] }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function AuditStatusBadge({ status }: { status: AuditStatus }) {
  const tone = status === "Blocked" ? "danger" : status === "Failed" ? "warning" : "success";
  return (
    <StatusBadge tone={tone} className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">
      {status}
    </StatusBadge>
  );
}

function AuditDetailsPanel({ event, activeQuery }: { event: DecoratedAuditEvent; activeQuery: string }) {
  const beforeValue = getMetadataValue(event.metadata, "before") ?? getMetadataValue(event.metadata, "previousValue");
  const afterValue = getMetadataValue(event.metadata, "after") ?? getMetadataValue(event.metadata, "newValue");

  return (
    <aside className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] xl:sticky xl:top-6 xl:self-start">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Event details</h2>
        <Link
          href={`/platform/audit-center${activeQuery ? `?${activeQuery}` : ""}`}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--medium-gray)] px-2.5 text-xs font-semibold text-[#7A8091] transition hover:bg-[var(--light-gray)] hover:text-[#171A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Close event details"
        >
          Close
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <dl className="mt-3 grid gap-1.5 text-xs">
        <PanelRow label="Action" value={formatAction(event.action)} />
        <PanelRow label="Event type" value={event.eventType} />
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Severity</dt>
          <dd><SeverityBadge severity={event.severity} className="px-2 py-0.5 text-[11px]" /></dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Result</dt>
          <dd><AuditStatusBadge status={event.status} /></dd>
        </div>
        <PanelRow label="Timestamp" value={formatDateTime(event.createdAt)} />
        <PanelRow label="User" value={event.actorUser?.name ?? "System"} />
        <PanelRow label="Role" value={event.actorUser ? roleLabels[event.actorUser.role] : "—"} />
        <PanelRow label="Business" value={event.business?.name ?? "—"} />
        <PanelRow label="Branch" value={event.branch?.name ?? "—"} />
        <PanelRow label="Entity" value={`${event.entityType}${event.entityId ? ` #${event.entityId}` : ""}`} />
        <PanelRow label="IP address" value={event.ipAddress} />
        <PanelRow label="Event ID" value={event.uuid} />
      </dl>
      <MetadataBlock title="Before value" value={beforeValue} />
      <MetadataBlock title="After value" value={afterValue} />
      <MetadataBlock title="Metadata" value={event.metadata} />
    </aside>
  );
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[#7A8091]">{label}</dt>
      <dd className="min-w-0 break-all text-right font-semibold text-[#171A21]">{value}</dd>
    </div>
  );
}

function MetadataBlock({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-[#171A21]">{title}</p>
      <pre className="mt-1.5 max-h-56 overflow-auto rounded-lg bg-[#171A21] p-3 text-xs leading-5 text-[#E7E9EE]">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function MonitorRow({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "neutral" | "ok" }) {
  const dot = tone === "danger" ? "bg-[#E24B4A]" : tone === "warning" ? "bg-[#EF9F27]" : tone === "neutral" ? "bg-[#888780]" : "bg-[#1D9E75]";
  const valueClass = tone === "danger" ? "text-[#A32D2D]" : "text-[#171A21]";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[#3D4352]">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>{value.toLocaleString("en-US")}</span>
    </div>
  );
}

function ExportItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-[#3D4352] transition hover:bg-[var(--light-gray)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      {icon}
      {label}
    </Link>
  );
}
