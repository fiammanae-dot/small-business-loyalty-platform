import Link from "next/link";
import type { ActivityAlertSeverity, ActivityAlertStatus, Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import { BarChart3, Bell, ChevronDown, Clock, Search, ShieldAlert, UserCheck } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { reviewActivityAlertAction } from "@/app/dashboard/notifications/actions";
import { alertCategory, defaultAbusePolicies } from "@/lib/alert-engine";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { activityHref, customerProfileHref, findRelatedStampTransaction, staffProfileHref } from "@/lib/alert-investigation";
import { alertTypeLabel } from "@/lib/alert-labels";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const severityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const workflowTabs = ["OPEN", "ASSIGNED", "UNDER_REVIEW", "ESCALATED", "RESOLVED", "DISMISSED"] as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    search?: string;
    severity?: string;
    priority?: string;
    status?: string;
    assigned?: string;
    assignedUser?: string;
    branch?: string;
    ruleType?: string;
    date?: string;
    from?: string;
    to?: string;
    riskMin?: string;
    riskMax?: string;
  }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const selectedStatus = workflowTabs.includes(params.status as (typeof workflowTabs)[number])
    ? (params.status as ActivityAlertStatus)
    : "OPEN";
  const branchId = params.branch ? Number(params.branch) : undefined;
  const assignedUserId = params.assignedUser ? Number(params.assignedUser) : undefined;
  const dateRange = getDateRange(params);
  const riskMin = params.riskMin ? Number(params.riskMin) : undefined;
  const riskMax = params.riskMax ? Number(params.riskMax) : undefined;
  const search = params.search?.trim();
  const numericSearch = search && /^\d+$/.test(search) ? Number(search) : undefined;
  const ruleTypes = defaultAbusePolicies.map((policy) => policy.ruleType);
  const baseWhere: Prisma.ActivityAlertWhereInput = { businessId: user.businessId };
  const where: Prisma.ActivityAlertWhereInput = {
    ...baseWhere,
    status: selectedStatus,
    ...(params.severity && severityValues.includes(params.severity as (typeof severityValues)[number])
      ? { severity: params.severity as ActivityAlertSeverity }
      : {}),
    ...(params.priority && severityValues.includes(params.priority as (typeof severityValues)[number])
      ? { priority: params.priority as ActivityAlertSeverity }
      : {}),
    ...(branchId ? { branchId } : {}),
    ...(params.ruleType && ruleTypes.includes(params.ruleType as (typeof ruleTypes)[number]) ? { alertType: params.ruleType } : {}),
    ...(dateRange ? { createdAt: { gte: dateRange.from, lte: dateRange.to } } : {}),
    ...(Number.isFinite(riskMin) || Number.isFinite(riskMax)
      ? { riskScore: { ...(Number.isFinite(riskMin) ? { gte: riskMin } : {}), ...(Number.isFinite(riskMax) ? { lte: riskMax } : {}) } }
      : {}),
    ...(params.assigned === "assigned" ? { assignedToUserId: { not: null } } : {}),
    ...(params.assigned === "unassigned" ? { assignedToUserId: null } : {}),
    ...(assignedUserId ? { assignedToUserId: assignedUserId } : {}),
    ...(search
      ? {
          OR: [
            ...(numericSearch ? [{ id: numericSearch }] : []),
            { alertType: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { user: { is: { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } } },
            { branch: { is: { name: { contains: search, mode: "insensitive" } } } },
            {
              customerProgramMembership: {
                is: {
                  loyaltyProgram: { is: { name: { contains: search, mode: "insensitive" } } },
                  businessCustomerMembership: {
                    is: {
                      globalCustomer: {
                        is: {
                          OR: [
                            { firstName: { contains: search, mode: "insensitive" } },
                            { lastName: { contains: search, mode: "insensitive" } },
                            { phone: { contains: search, mode: "insensitive" } },
                            { normalizedPhone: { contains: search, mode: "insensitive" } },
                            { email: { contains: search, mode: "insensitive" } },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [alerts, allAlerts, branches, assignableUsers] = await Promise.all([
    prisma.activityAlert.findMany({
      where,
      orderBy: [{ priority: "desc" }, { riskScore: "desc" }, { createdAt: "desc" }],
      include: {
        alertEvents: { orderBy: { createdAt: "desc" }, take: 8, include: { actorUser: { select: { name: true, email: true } } } },
        branch: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { name: true, email: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        customerProgramMembership: {
          include: {
            loyaltyProgram: true,
            businessCustomerMembership: {
              include: { globalCustomer: true },
            },
          },
        },
      },
    }),
    prisma.activityAlert.findMany({
      where: baseWhere,
      select: { id: true, status: true, severity: true, priority: true, riskScore: true, branchId: true, branch: { select: { id: true, name: true } }, alertType: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.branch.findMany({
      where: { businessId: user.businessId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { businessId: user.businessId, role: { in: ["BUSINESS_OWNER", "BRANCH_MANAGER"] }, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const counts = buildCounts(allAlerts);
  const branchRisks = buildBranchRisks(branches, allAlerts);
  const alertAnalytics = buildAlertAnalytics(allAlerts);
  const alertRows = await Promise.all(
    alerts.map(async (alert) => {
      const relatedTransaction = await findRelatedStampTransaction(alert);
      const membershipUuid = alert.customerProgramMembership?.businessCustomerMembership.uuid;
      return {
        alert,
        relatedTransactionId: relatedTransaction?.id ?? null,
        customerHref: customerProfileHref(membershipUuid, alert.id, relatedTransaction?.id),
        staffHref: staffProfileHref(alert.user?.id, alert.id, relatedTransaction?.id),
        activityHref: activityHref(relatedTransaction?.id, alert.id),
      };
    }),
  );

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Alert Center">
      {params.error || params.success ? (
        <p className={`rounded-md border px-3 py-2 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {params.error ?? params.success}
        </p>
      ) : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold business-text">Fraud and risk investigation</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#111827]">Alert Center</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Investigate suspicious activity without leaving the alert workspace.</p>
          </div>
          <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">
            Back to dashboard
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FilterSummary href={filterHref(params, { status: "OPEN", severity: "", branch: "" })} icon={<ShieldAlert className="h-5 w-5" />} label="Open Alerts" value={counts.OPEN} />
          <FilterSummary href={filterHref(params, { status: "OPEN", severity: "HIGH" })} label="High Risk" value={counts.HIGH} tone="red" />
          <FilterSummary href={filterHref(params, { status: "OPEN", severity: "MEDIUM" })} label="Medium Risk" value={counts.MEDIUM} tone="orange" />
          <FilterSummary href={filterHref(params, { status: "OPEN", severity: "LOW" })} label="Low Risk" value={counts.LOW} tone="green" />
          <FilterSummary href={filterHref(params, { status: "ASSIGNED", severity: "" })} icon={<UserCheck className="h-5 w-5" />} label="Assigned" value={counts.ASSIGNED} />
          <FilterSummary href={filterHref(params, { status: "ESCALATED", severity: "" })} icon={<Bell className="h-5 w-5" />} label="Escalated" value={counts.ESCALATED} tone="red" />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold business-text">Branch Risk Overview</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111827]">Branch exposure</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {branchRisks.map((branch) => (
            <Link key={branch.id} href={filterHref(params, { branch: branch.id.toString(), status: selectedStatus })} className="rounded-md border border-[#E5E7EB] p-3 transition business-hover">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#111827]">{branch.name}</p>
                <SeverityBadge severity={branch.highestSeverity} />
              </div>
              <p className="mt-2 text-sm text-[#6B7280]">{branch.count} alert{branch.count === 1 ? "" : "s"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <label className="relative lg:col-span-2">
            <span className="sr-only">Search alerts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" aria-hidden="true" />
            <input name="search" defaultValue={params.search ?? ""} placeholder="Search customer, phone, staff, branch, alert ID, program" className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm" />
          </label>
          <select name="severity" defaultValue={params.severity ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All severities</option>
            {severityValues.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
          </select>
          <select name="priority" defaultValue={params.priority ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All priorities</option>
            {severityValues.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
          <select name="assigned" defaultValue={params.assigned ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All owners</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <SearchableCombobox
            label="Assigned user"
            name="assignedUser"
            defaultValue={params.assignedUser ?? ""}
            placeholder="Assigned user"
            emptyLabel="No assignable users found."
            options={[
              { value: "", label: "Assigned user", description: "All alert owners" },
              ...assignableUsers.map((assignableUser) => ({
                value: assignableUser.id.toString(),
                label: assignableUser.name,
                description: assignableUser.role.replaceAll("_", " ").toLowerCase(),
                badge: "Owner",
              })),
            ]}
          />
          <SearchableCombobox
            label="Branch"
            name="branch"
            defaultValue={params.branch ?? ""}
            placeholder="All branches"
            emptyLabel="No branches found."
            options={[
              { value: "", label: "All branches", description: "Show alerts from every branch" },
              ...branches.map((branch) => ({ value: branch.id.toString(), label: branch.name, description: "Branch" })),
            ]}
          />
          <select name="ruleType" defaultValue={params.ruleType ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All rule types</option>
            {defaultAbusePolicies.map((policy) => <option key={policy.ruleType} value={policy.ruleType}>{policy.policyName}</option>)}
          </select>
          <select name="date" defaultValue={params.date ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All dates</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <input type="date" name="from" defaultValue={params.from ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm" />
          <input type="date" name="to" defaultValue={params.to ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm" />
          <input type="number" min="0" max="100" name="riskMin" defaultValue={params.riskMin ?? ""} placeholder="Risk min" className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm" />
          <input type="number" min="0" max="100" name="riskMax" defaultValue={params.riskMax ?? ""} placeholder="Risk max" className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm" />
          <button type="submit" className="h-10 rounded-md business-button px-4 text-sm font-semibold text-white">Apply</button>
          <Link href="/dashboard/notifications" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827]">
            Clear Filters
          </Link>
        </form>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {workflowTabs.map((tab) => (
              <Link key={tab} href={filterHref(params, { status: tab })} className={`rounded-md px-3 py-2 text-sm font-semibold ${selectedStatus === tab ? "business-button text-white" : "bg-[#F3F4F6] text-[#374151] business-hover"}`}>
                {tab.replaceAll("_", " ")}
              </Link>
            ))}
          </div>
          <p className="text-sm font-semibold text-[#6B7280]">Showing {alerts.length} alerts</p>
        </div>

        <div className="mb-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 business-text" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-[#111827]">Alert analytics</h3>
              <p className="text-sm text-[#6B7280]">Alerts by Day, Alerts by Severity, Alerts by Category, and Top Alert Sources.</p>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            <MiniChart title="Alerts by Day" rows={alertAnalytics.byDay} />
            <MiniChart title="Alerts by Severity" rows={alertAnalytics.bySeverity} />
            <MiniChart title="Alerts by Category" rows={alertAnalytics.byCategory} />
            <MiniChart title="Top Alert Sources" rows={alertAnalytics.topSources} />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {alertRows.map((row) => (
            <AlertCard key={row.alert.id} row={row} assignableUsers={assignableUsers} />
          ))}
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-[#111827]">No alerts match these filters.</p>
            <p className="mt-2 text-sm text-[#6B7280]">Clear filters or select another workflow tab.</p>
            <Link href="/dashboard/notifications" className="mt-4 inline-flex rounded-md business-button px-4 py-2 text-sm font-semibold text-white">Clear Filters</Link>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}

function AlertCard({
  row,
  assignableUsers,
}: {
  row: AlertRow;
  assignableUsers: Array<{ id: number; name: string; role: string }>;
}) {
  const { alert, customerHref, staffHref, activityHref } = row;
  const customer = alert.customerProgramMembership?.businessCustomerMembership.globalCustomer;
  const customerName = customer ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : "-";
  const programName = alert.customerProgramMembership?.loyaltyProgram.name ?? "-";
  const canManage = !["RESOLVED", "DISMISSED", "REVIEWED"].includes(alert.status);

  return (
    <details className="group min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-3 shadow-sm open:ring-1 open:ring-[var(--business-primary-border)]">
      <summary className="flex cursor-pointer list-none flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <span className="rounded-md bg-[#F3F4F6] px-2 py-1 text-xs font-semibold text-[#374151]">{alert.status.replaceAll("_", " ")}</span>
            </div>
            <h3 className="mt-2 truncate text-base font-semibold text-[#111827]">{alertTypeLabel(alert.alertType)}</h3>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-[#6B7280] transition group-open:rotate-180" aria-hidden="true" />
        </div>
        <div className="grid gap-2 text-sm text-[#6B7280] sm:grid-cols-2">
          <CompactInfo label="Customer" value={customerName} />
          <CompactInfo label="Branch" value={alert.branch?.name ?? "-"} />
          <RiskMeter score={alert.riskScore} />
          <CompactInfo label="Alert date" value={formatDateTime(alert.createdAt)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827]">Investigate Alert</span>
          {canManage ? <ActionForm alert={alert} assignableUsers={assignableUsers} compactAction="ASSIGNED" label="Assign" /> : null}
          {canManage ? <ActionForm alert={alert} assignableUsers={assignableUsers} compactAction="RESOLVED" label="Resolve" /> : null}
          {canManage ? <AlertActionsDropdown alert={alert} assignableUsers={assignableUsers} /> : <span className="rounded-md bg-[#F3F4F6] px-3 py-2 text-xs font-semibold text-[#6B7280]">Closed</span>}
        </div>
      </summary>

      <div className="mt-4 grid min-w-0 gap-4 border-t border-[#E5E7EB] pt-4 xl:grid-cols-2">
        <div className="grid min-w-0 gap-4">
          <InvestigationPanel title="Business impact">
            <p>Why was this alert generated? {alert.description}</p>
            <p>Potential business impact: possible loyalty abuse, incorrect stamp issuance, or operational risk requiring review.</p>
            <p>Affected Customer: {customerName}.</p>
            <p>Affected Program: {programName}.</p>
          </InvestigationPanel>
          <InvestigationPanel title="Activity timeline">
            <TimelineItem icon={<Clock className="h-4 w-4" />} label="Alert created" value={formatDateTime(alert.createdAt)} />
            <TimelineItem icon={<ShieldAlert className="h-4 w-4" />} label="Last detected" value={alert.lastDetectedAt ? formatDateTime(alert.lastDetectedAt) : formatDateTime(alert.createdAt)} />
            <TimelineItem icon={<Bell className="h-4 w-4" />} label="Occurrences" value={alert.occurrenceCount.toString()} />
          </InvestigationPanel>
          <InvestigationPanel title="Alert history and audit history">
            {alert.alertEvents.length ? (
              <div className="grid gap-2">
                {alert.alertEvents.map((event) => (
                  <div key={event.id} className="rounded-md bg-[#FAFAFA] p-3 text-sm">
                    <p className="font-semibold text-[#111827]">{event.eventType.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {formatDateTime(event.createdAt)} by {event.actorUser?.name ?? "System"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No alert history yet.</p>
            )}
          </InvestigationPanel>
        </div>

        <aside className="grid min-w-0 gap-3 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
          <InvestigationPanel title="Customer details">
            <p>Name: {customerName}</p>
            <p>Phone: {customer?.phone ?? "-"}</p>
            {customerHref ? <InvestigationLink href={customerHref} label="View Customer" /> : null}
          </InvestigationPanel>
          <InvestigationPanel title="Staff details">
            <p>Name: {alert.user?.name ?? "-"}</p>
            <p>Role: {alert.user?.role?.replaceAll("_", " ") ?? "-"}</p>
            {staffHref ? <InvestigationLink href={staffHref} label="View Staff" /> : null}
          </InvestigationPanel>
          <InvestigationPanel title="Branch details">
            <p>Branch: {alert.branch?.name ?? "-"}</p>
            <p>Program: {programName}</p>
            {activityHref ? <InvestigationLink href={activityHref} label="View Activity" /> : null}
          </InvestigationPanel>
          <InvestigationPanel title="Review notes and escalation controls">
            <p>Owner: {alert.assignedToUser?.name ?? "Unassigned"}</p>
            <p>Review note: {alert.reviewNote ?? "-"}</p>
            <p>Escalation reason: {alert.escalationReason ?? "-"}</p>
          </InvestigationPanel>
        </aside>
      </div>
    </details>
  );
}

function AlertActionsDropdown({
  alert,
  assignableUsers,
}: {
  alert: AlertRow["alert"];
  assignableUsers: Array<{ id: number; name: string; role: string }>;
}) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827]">
        Actions <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-[#E5E7EB] bg-white p-3 shadow-lg">
        <ActionForm alert={alert} assignableUsers={assignableUsers} />
      </div>
    </details>
  );
}

function ActionForm({
  alert,
  assignableUsers,
  compactAction,
  label,
}: {
  alert: AlertRow["alert"];
  assignableUsers: Array<{ id: number; name: string; role: string }>;
  compactAction?: "ASSIGNED" | "RESOLVED";
  label?: string;
}) {
  if (compactAction) {
    return (
      <form action={reviewActivityAlertAction}>
        <CsrfInput scope="dashboard:notifications" />
        <input type="hidden" name="alertId" value={alert.id} />
        <input type="hidden" name="priority" value={alert.priority} />
        <input type="hidden" name="assignedToUserId" value={alert.assignedToUser?.id ?? ""} />
        <button name="status" value={compactAction} className={`rounded-md px-3 py-2 text-xs font-semibold ${compactAction === "RESOLVED" ? "border border-emerald-200 text-emerald-700" : "business-button text-white"}`}>
          {label}
        </button>
      </form>
    );
  }

  return (
    <form action={reviewActivityAlertAction} className="grid gap-2">
      <CsrfInput scope="dashboard:notifications" />
      <input type="hidden" name="alertId" value={alert.id} />
      <SearchableCombobox
        label="Assign owner"
        name="assignedToUserId"
        defaultValue={alert.assignedToUser?.id.toString() ?? ""}
        placeholder="Assign owner"
        emptyLabel="No assignable users found."
        options={[
          { value: "", label: "Assign owner", description: "Leave unassigned" },
          ...assignableUsers.map((assignableUser) => ({
            value: assignableUser.id.toString(),
            label: assignableUser.name,
            description: assignableUser.role.replaceAll("_", " ").toLowerCase(),
            badge: "Owner",
          })),
        ]}
      />
      <select name="priority" defaultValue={alert.priority} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-xs">
        {severityValues.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>
      <textarea name="reviewNote" rows={2} className="rounded-md border border-[#E5E7EB] px-3 py-2 text-xs outline-none business-ring focus:ring-0" placeholder="Review note" />
      <input name="escalationReason" className="rounded-md border border-[#E5E7EB] px-3 py-2 text-xs outline-none business-ring focus:ring-0" placeholder="Escalation reason" />
      <div className="grid grid-cols-2 gap-2">
        <button name="status" value="ASSIGNED" className="rounded-md business-button px-3 py-2 text-xs font-semibold text-white">Assign</button>
        <button name="status" value="UNDER_REVIEW" className="rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827]">Review</button>
        <button name="status" value="ESCALATED" className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Escalate</button>
        <button name="status" value="RESOLVED" className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">Resolve</button>
        <button name="status" value="DISMISSED" className="col-span-2 rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827]">Dismiss</button>
      </div>
    </form>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase text-[#9CA3AF]">{label}</p>
      <p className="mt-1 truncate font-medium text-[#111827]" title={value}>{value}</p>
    </div>
  );
}

function RiskMeter({ score }: { score: number }) {
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-orange-500" : "bg-emerald-500";
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-[#9CA3AF]">Risk score</p>
        <p className="text-sm font-semibold text-[#111827]">{score}/100</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
    </div>
  );
}

function InvestigationPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-3 text-sm leading-6 text-[#6B7280]">
      <h4 className="mb-2 font-semibold text-[#111827]">{title}</h4>
      <div className="grid min-w-0 gap-1 break-words">{children}</div>
    </section>
  );
}

function TimelineItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-md bg-[#FAFAFA] p-2">
      <span className="business-text">{icon}</span>
      <div className="min-w-0">
        <p className="font-semibold text-[#111827]">{label}</p>
        <p className="break-words text-xs text-[#6B7280]">{value}</p>
      </div>
    </div>
  );
}

function InvestigationLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex rounded-md border border-[#E5E7EB] px-2 py-1 text-xs font-semibold text-[#111827] transition business-hover">
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

function FilterSummary({ href, icon, label, value, tone = "default" }: { href: string; icon?: ReactNode; label: string; value: number; tone?: "default" | "red" | "orange" | "green" }) {
  const metricTone = tone === "red" ? "danger" : tone === "orange" ? "warning" : tone === "green" ? "success" : "neutral";
  return <MetricCard href={href} label={label} value={value} icon={icon} tone={metricTone} className="h-full" />;
}
function MiniChart({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="min-w-0 rounded-md border border-[#E5E7EB] bg-white p-3">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <div className="mt-3 grid gap-2">
        {rows.length ? rows.map((row) => (
          <div key={`${title}-${row.label}`} className="min-w-0">
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-[#6B7280]" title={row.label}>{row.label}</span>
              <strong className="w-8 shrink-0 text-right text-[#111827]">{row.value}</strong>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div className="h-2 rounded-full business-button" style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        )) : <EmptyState title="No alert data yet." className="p-4 md:p-4" />}
      </div>
    </div>
  );
}

function buildCounts(alerts: Array<{ status: string; severity: string }>) {
  return {
    OPEN: alerts.filter((alert) => alert.status === "OPEN").length,
    ASSIGNED: alerts.filter((alert) => alert.status === "ASSIGNED").length,
    ESCALATED: alerts.filter((alert) => alert.status === "ESCALATED").length,
    HIGH: alerts.filter((alert) => alert.status === "OPEN" && alert.severity === "HIGH").length,
    MEDIUM: alerts.filter((alert) => alert.status === "OPEN" && alert.severity === "MEDIUM").length,
    LOW: alerts.filter((alert) => alert.status === "OPEN" && alert.severity === "LOW").length,
  };
}

function buildBranchRisks(
  branches: Array<{ id: number; name: string }>,
  alerts: Array<{ branchId: number | null; severity: string }>,
) {
  const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as Record<string, number>;
  return branches.map((branch) => {
    const branchAlerts = alerts.filter((alert) => alert.branchId === branch.id);
    const highestSeverity = branchAlerts
      .map((alert) => alert.severity)
      .sort((a, b) => (severityRank[b] ?? 0) - (severityRank[a] ?? 0))[0] ?? "LOW";
    return { ...branch, count: branchAlerts.length, highestSeverity };
  });
}

function buildAlertAnalytics(alerts: Array<{
  alertType: string;
  severity: ActivityAlertSeverity;
  branch: { name: string } | null;
  user: { name: string } | null;
  createdAt: Date;
}>) {
  return {
    byDay: countRows(alerts.map((alert) => alert.createdAt.toLocaleDateString("en", { month: "short", day: "2-digit" }))).slice(0, 7),
    bySeverity: countRows(alerts.map((alert) => alert.severity)),
    byCategory: countRows(alerts.map((alert) => alertCategory(alert.alertType))),
    topSources: countRows(alerts.map((alert) => alert.user?.name ?? alert.branch?.name ?? "System")).slice(0, 5),
  };
}

function countRows(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function filterHref(params: Record<string, string | undefined>, updates: Record<string, string>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `/dashboard/notifications?${query}` : "/dashboard/notifications";
}

function getDateRange(params: { date?: string; from?: string; to?: string }) {
  const now = new Date();
  if (params.date === "custom" && params.from && params.to) {
    return { from: new Date(`${params.from}T00:00:00.000Z`), to: new Date(`${params.to}T23:59:59.999Z`) };
  }
  if (params.date === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (params.date === "7d") return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  if (params.date === "30d") return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
  return null;
}

type AlertRow = {
  alert: Prisma.ActivityAlertGetPayload<{
    include: {
      alertEvents: { include: { actorUser: { select: { name: true; email: true } } } };
      branch: true;
      user: { select: { id: true; name: true; email: true; role: true } };
      reviewer: { select: { name: true; email: true } };
      assignedToUser: { select: { id: true; name: true; email: true } };
      customerProgramMembership: {
        include: {
          loyaltyProgram: true;
          businessCustomerMembership: { include: { globalCustomer: true } };
        };
      };
    };
  }>;
  relatedTransactionId: number | null;
  customerHref: string | null;
  staffHref: string | null;
  activityHref: string | null;
};











