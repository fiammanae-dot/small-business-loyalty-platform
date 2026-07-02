import type { Prisma, SupportRequestStatus, SupportSessionStatus } from "@prisma/client";
import { Activity, AlertTriangle, ChevronRight, Clock, FileText, LifeBuoy, RefreshCw, Search, Timer, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { SupportCountdown } from "@/components/SupportCountdown";
import { EmptyState, MetricCard, SectionCard, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { expireStaleSupportRequests, expireStaleSupportSessions } from "@/lib/support-sessions";
import { requireRole } from "@/lib/session";

type OperationsSearchParams = { q?: string; status?: string; requestStatus?: string; mode?: string; from?: string; to?: string };

type SupportSessionListItem = Prisma.SupportSessionGetPayload<{
  include: {
    business: { select: { name: true; uuid: true } };
    adminUser: { select: { name: true; email: true } };
    _count: { select: { activities: true } };
  };
}>;

type SupportRequestListItem = Prisma.SupportRequestGetPayload<{
  include: {
    business: { select: { name: true; uuid: true } };
    requestedByUser: { select: { name: true; email: true } };
    reviewedByUser: { select: { name: true; email: true } };
    supportSession: { select: { id: true; status: true } };
  };
}>;

const validStatuses: SupportSessionStatus[] = ["ACTIVE", "ENDED", "EXPIRED"];
const validRequestStatuses: SupportRequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "EXPIRED"];

function getParam(params: OperationsSearchParams, key: keyof OperationsSearchParams) {
  return typeof params[key] === "string" ? params[key]?.trim() ?? "" : "";
}

function parseDate(value: string, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDurationMs(session: { startedAt: Date; endedAt: Date | null; expiresAt: Date }) {
  const end = session.endedAt ?? session.expiresAt;
  return Math.max(0, end.getTime() - session.startedAt.getTime());
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0 minutes";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} ${totalMinutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function commonReason(sessions: SupportSessionListItem[]) {
  const counts = new Map<string, number>();
  for (const session of sessions) counts.set(session.reason, (counts.get(session.reason) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No sessions yet";
}

export default async function OperationsCenterPage({ searchParams }: { searchParams: Promise<OperationsSearchParams> }) {
  const currentUser = await requireRole("PLATFORM_OWNER");
  await Promise.all([expireStaleSupportSessions(), expireStaleSupportRequests()]);

  const params = await searchParams;
  const query = getParam(params, "q");
  const status = validStatuses.includes(params.status as SupportSessionStatus) ? (params.status as SupportSessionStatus) : "";
  const requestStatus = validRequestStatuses.includes(params.requestStatus as SupportRequestStatus) ? (params.requestStatus as SupportRequestStatus) : "";
  const mode = params.mode === "read-only" || params.mode === "edit" ? params.mode : "";
  const from = parseDate(getParam(params, "from"));
  const to = parseDate(getParam(params, "to"), true);
  const startedAt: Prisma.DateTimeFilter = {};
  if (from) startedAt.gte = from;
  if (to) startedAt.lte = to;

  const sessionWhere: Prisma.SupportSessionWhereInput = {
    ...(status ? { status } : {}),
    ...(mode ? { readOnly: mode === "read-only" } : {}),
    ...(from || to ? { startedAt } : {}),
    ...(query
      ? {
          OR: [
            { reason: { contains: query, mode: "insensitive" } },
            { business: { is: { name: { contains: query, mode: "insensitive" } } } },
            { adminUser: { is: { name: { contains: query, mode: "insensitive" } } } },
            { adminUser: { is: { email: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const requestWhere: Prisma.SupportRequestWhereInput = {
    ...(requestStatus ? { status: requestStatus } : {}),
    ...(mode ? { readOnly: mode === "read-only" } : {}),
    ...(from || to ? { createdAt: startedAt } : {}),
    ...(query
      ? {
          OR: [
            { reason: { contains: query, mode: "insensitive" } },
            { business: { is: { name: { contains: query, mode: "insensitive" } } } },
            { requestedByUser: { is: { name: { contains: query, mode: "insensitive" } } } },
            { requestedByUser: { is: { email: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [sessions, allSessions, requests, activeAlerts] = await Promise.all([
    prisma.supportSession.findMany({
      where: sessionWhere,
      orderBy: { startedAt: "desc" },
      take: 100,
      include: { business: { select: { name: true, uuid: true } }, adminUser: { select: { name: true, email: true } }, _count: { select: { activities: true } } },
    }),
    prisma.supportSession.findMany({
      orderBy: { startedAt: "desc" },
      include: { business: { select: { name: true, uuid: true } }, adminUser: { select: { name: true, email: true } }, _count: { select: { activities: true } } },
    }),
    prisma.supportRequest.findMany({
      where: requestWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { name: true, uuid: true } },
        requestedByUser: { select: { name: true, email: true } },
        reviewedByUser: { select: { name: true, email: true } },
        supportSession: { select: { id: true, status: true } },
      },
    }),
    prisma.activityAlert.count({ where: { status: "OPEN" } }),
  ]);

  const activeSessions = sessions.filter((session) => session.status === "ACTIVE" && !session.endedAt && session.expiresAt > now);
  const recentSessions = sessions.filter((session) => session.status !== "ACTIVE" || session.endedAt || session.expiresAt <= now);
  const pendingRequests = requests.filter((request) => request.status === "PENDING");
  const completedToday = allSessions.filter((session) => session.endedAt && session.endedAt >= todayStart).length;
  const sessionsToday = allSessions.filter((session) => session.startedAt >= todayStart).length;
  const completedDurations = allSessions.filter((session) => session.endedAt || session.status === "EXPIRED").map(getDurationMs);
  const averageDuration = completedDurations.length ? completedDurations.reduce((total, duration) => total + duration, 0) / completedDurations.length : 0;
  const longestDuration = completedDurations.length ? Math.max(...completedDurations) : 0;

  return (
    <DashboardShell
      user={currentUser}
      eyebrow="System Administrator"
      title="Operations Center"
      headerAside={
        <Link
          href="/platform/operations-center/support/start"
          className="hidden min-h-11 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 lg:inline-flex"
        >
          Start Support Session
        </Link>
      }
    >
      <div className="grid gap-6">
        <div data-operations-center-lite className="grid gap-4 pb-24 lg:hidden">
          <section className="grid gap-3 sm:grid-cols-2" aria-label="Operations Center Lite KPIs">
            <MetricCard label="Active Support Sessions" value={activeSessions.length} helper="Live support access" icon={<LifeBuoy className="h-5 w-5" />} tone="danger" />
            <MetricCard label="Sessions Today" value={sessionsToday} helper={`${completedToday} completed today`} icon={<Activity className="h-5 w-5" />} tone="success" />
            <MetricCard label="Average Duration" value={formatDuration(averageDuration)} helper="Completed sessions" icon={<Clock className="h-5 w-5" />} />
            <MetricCard label="Active Alerts" value={activeAlerts} helper="Open platform alerts" icon={<AlertTriangle className="h-5 w-5" />} tone={activeAlerts ? "warning" : "neutral"} />
          </section>

          <SectionCard id="active-support-sessions" title="Active Support Sessions" description="Urgent support sessions available from mobile.">
            {activeSessions.length ? (
              <div className="grid gap-3">
                {activeSessions.map((session) => (
                  <MobileSupportSessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <EmptyState title="No active support sessions." description="Start or join a support session when urgent access is needed." />
            )}
          </SectionCard>

          <SectionCard title="Desktop Tools" description="Support reports, audit timelines, exports, advanced filters, Compliance, Platform Health, and Background Jobs are available on desktop.">
            <p className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-semibold text-[#475569]">Available on desktop.</p>
          </SectionCard>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E2E8F0] bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden" aria-label="Operations Center Lite quick actions">
            <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
              <Link href="/platform/operations-center/support/start" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#F97316] px-3 text-center text-xs font-bold text-white transition hover:bg-orange-600">
                Start Support Session
              </Link>
              <Link href="#active-support-sessions" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-3 text-center text-xs font-bold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
                Active Sessions
              </Link>
              <Link href="/platform/operations-center" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-[#CBD5E1] bg-white px-3 text-center text-xs font-bold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Refresh
              </Link>
            </div>
          </nav>
        </div>

        <div className="hidden gap-6 lg:grid">
          <section className="rounded-lg border border-[#E2E8F0] bg-white p-2 shadow-sm">
            <div className="grid gap-2 md:grid-cols-4">
              <TabItem label="Support" active />
              <TabItem label="Compliance" comingSoon />
              <TabItem label="Platform Health" comingSoon />
              <TabItem label="Background Jobs" comingSoon />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <MetricCard label="Active Sessions" value={activeSessions.length} helper="Live support access" icon={<LifeBuoy className="h-5 w-5" />} tone="danger" />
            <MetricCard label="Pending Requests" value={pendingRequests.length} helper="Awaiting owner approval" icon={<FileText className="h-5 w-5" />} tone="warning" />
            <MetricCard label="Completed Today" value={completedToday} helper="Ended sessions" icon={<Activity className="h-5 w-5" />} tone="success" />
            <MetricCard label="Average Duration" value={formatDuration(averageDuration)} helper="Completed sessions" icon={<Clock className="h-5 w-5" />} />
            <MetricCard label="Longest Session" value={formatDuration(longestDuration)} helper="Historical maximum" icon={<Timer className="h-5 w-5" />} tone="warning" />
            <MetricCard label="Common Reason" value={commonReason(allSessions)} helper="Most frequent reason" icon={<FileText className="h-5 w-5" />} tone="neutral" />
            <MetricCard label="Total Sessions" value={allSessions.length} helper="All support access" icon={<Users className="h-5 w-5" />} tone="info" />
          </section>

          <SectionCard title="Search & Filters" description="Find support sessions and approval requests by business, administrator, reason, status, mode, or date range.">
            <form className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_150px_150px_150px_150px_150px_auto_auto] lg:items-end">
              <label className="text-sm font-semibold text-[#111827]">
                Search
                <div className="mt-1 flex min-w-0 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3">
                  <Search className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
                  <input name="q" defaultValue={query} placeholder="Business, administrator, reason" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </div>
              </label>
              <SelectField label="Session" name="status" defaultValue={status}>
                <option value="">All sessions</option>
                <option value="ACTIVE">Active</option>
                <option value="ENDED">Ended</option>
                <option value="EXPIRED">Expired</option>
              </SelectField>
              <SelectField label="Request" name="requestStatus" defaultValue={requestStatus}>
                <option value="">All requests</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </SelectField>
              <SelectField label="Mode" name="mode" defaultValue={mode}>
                <option value="">All modes</option>
                <option value="read-only">Read Only</option>
                <option value="edit">Edit</option>
              </SelectField>
              <InputField label="From" name="from" defaultValue={getParam(params, "from")} />
              <InputField label="To" name="to" defaultValue={getParam(params, "to")} />
              <button type="submit" className="min-h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600">
                Apply
              </button>
              <Link href="/platform/operations-center" className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#E2E8F0] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]">
                Clear
              </Link>
            </form>
          </SectionCard>

          <SectionCard title="Pending Requests" description="Support requests waiting for Business Owner approval.">
            {pendingRequests.length ? <div className="grid gap-3">{pendingRequests.map((request) => <SupportRequestCard key={request.id} request={request} />)}</div> : <EmptyState title="No pending support requests." description="Approval-required support access requests will appear here." />}
          </SectionCard>

          <SectionCard title="Approved, Rejected & Expired Requests" description="Completed support approval decisions and expired requests.">
            {requests.filter((request) => request.status !== "PENDING").length ? (
              <div className="grid gap-3">{requests.filter((request) => request.status !== "PENDING").map((request) => <SupportRequestCard key={request.id} request={request} />)}</div>
            ) : (
              <EmptyState title="No completed support requests." description="Approved, rejected, and expired requests matching the current filters will appear here." />
            )}
          </SectionCard>

          <SectionCard title="Active Support Sessions" description="Live support sessions with emergency controls.">
            {activeSessions.length ? <div className="grid gap-3">{activeSessions.map((session) => <SupportSessionCard key={session.id} session={session} active />)}</div> : <EmptyState title="No active support sessions." description="Active support sessions will appear here as soon as a Platform Administrator starts or joins one." />}
          </SectionCard>

          <SectionCard title="Recent Support Sessions" description="Completed and expired support sessions with activity counts and reports.">
            {recentSessions.length ? <div className="grid gap-3">{recentSessions.map((session) => <SupportSessionCard key={session.id} session={session} />)}</div> : <EmptyState title="No recent support sessions." description="Ended and expired support sessions matching the current filters will appear here." />}
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  );
}

function TabItem({ label, active, comingSoon }: { label: string; active?: boolean; comingSoon?: boolean }) {
  return (
    <div className={`rounded-md px-4 py-3 text-sm font-semibold ${active ? "bg-[#F97316] text-white" : "bg-[#F8FAFC] text-[#64748B]"}`}>
      <span>{label}</span>
      {comingSoon ? <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-[#64748B]">Not enabled</span> : null}
    </div>
  );
}

function SupportRequestCard({ request }: { request: SupportRequestListItem }) {
  const requester = request.requestedByUser.name ?? request.requestedByUser.email;
  const detailsHref = `/platform/operations-center/requests/${request.id}`;
  return (
    <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] transition hover:border-[#F97316] hover:bg-[#FFF7ED]">
      <Link href={detailsHref} className="group block p-4 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]" aria-label={`Open support request details for ${request.business.name}`}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_24px] xl:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Business</p>
          <span className="mt-1 inline-flex min-w-0 items-center gap-1 break-words text-base font-bold text-[#0F172A] transition group-hover:text-[#F97316]">
            {request.business.name}
          </span>
          <p className="mt-2 text-sm text-[#64748B]">
            Requested by: <span className="font-semibold text-[#334155]">{requester}</span>
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Status" value={<StatusBadge tone={request.status === "PENDING" ? "warning" : request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "danger" : "neutral"}>{request.status}</StatusBadge>} />
          <Info label="Time Remaining" value={request.status === "PENDING" ? <SupportCountdown expiresAt={request.expiresAt.toISOString()} /> : formatDateTime(request.expiresAt)} />
          <Info label="Mode" value={request.readOnly ? "Read Only" : "Edit"} />
          <Info label="Emergency" value={request.emergency ? <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">Emergency</span> : "No"} />
        </dl>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Request</p>
          <p className="mt-1 text-sm font-medium text-[#334155]">Requested {formatDateTime(request.createdAt)}</p>
          <p className="mt-2 text-xs font-semibold text-[#64748B]">Duration: {request.durationMinutes} minutes</p>
        </div>
        <span className="flex h-10 w-6 items-center justify-end text-[#94A3B8] transition">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </span>
        </div>
      </Link>
    </article>
  );
}

function SupportSessionCard({ session, active = false }: { session: SupportSessionListItem; active?: boolean }) {
  const adminName = session.adminUser.name ?? session.adminUser.email;
  const detailsHref = `/platform/operations-center/support/${session.id}`;
  return (
    <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] transition hover:border-[#F97316] hover:bg-[#FFF7ED]">
      <Link href={detailsHref} className="group block p-4 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]" aria-label={`Open support session details for ${session.business.name}`}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_24px] xl:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Business</p>
          <span className="mt-1 inline-flex min-w-0 items-center gap-1 break-words text-base font-bold text-[#0F172A] transition group-hover:text-[#F97316]">
            {session.business.name}
          </span>
          <p className="mt-2 text-sm text-[#64748B]">
            Administrator: <span className="font-semibold text-[#334155]">{adminName}</span>
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Started" value={formatDateTime(session.startedAt)} />
          <Info label={active ? "Remaining" : "Duration"} value={active ? <SupportCountdown expiresAt={session.expiresAt.toISOString()} /> : formatDuration(getDurationMs(session))} />
          <Info label="Mode" value={session.readOnly ? "Read Only" : "Edit"} />
          <Info label="Status" value={<StatusBadge tone={session.status === "ACTIVE" ? "success" : session.status === "EXPIRED" ? "warning" : "neutral"}>{session.status}</StatusBadge>} />
        </dl>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Reason</p>
          <p className="mt-1 break-words text-sm font-medium text-[#334155]">{session.reason}</p>
          <p className="mt-2 text-xs font-semibold text-[#64748B]">{session._count.activities} activities</p>
        </div>
        <span className="flex h-10 w-6 items-center justify-end text-[#94A3B8] transition">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </span>
        </div>
      </Link>
    </article>
  );
}

function MobileSupportSessionCard({ session }: { session: SupportSessionListItem }) {
  const adminName = session.adminUser.name ?? session.adminUser.email;
  return (
    <Link href={`/platform/operations-center/support/${session.id}`} className="block rounded-lg border border-red-100 bg-red-50/60 p-4 shadow-sm transition hover:border-[#F97316] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Business</p>
          <h3 className="mt-1 flex items-center gap-1 break-words text-lg font-bold text-[#0F172A]">
            {session.business.name}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </h3>
        </div>
        <StatusBadge tone="success">{session.status}</StatusBadge>
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        <Info label="Administrator" value={adminName} />
        <Info label="Remaining Time" value={<SupportCountdown expiresAt={session.expiresAt.toISOString()} />} />
        <Info label="Reason" value={session.reason} />
      </dl>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-white p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[#0F172A]">{value}</dd>
    </div>
  );
}

function SelectField({ label, name, defaultValue, children }: { label: string; name: string; defaultValue?: string; children: ReactNode }) {
  return (
    <label className="text-sm font-semibold text-[#111827]">
      {label}
      <select name={name} defaultValue={defaultValue} className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#F97316]">
        {children}
      </select>
    </label>
  );
}

function InputField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="text-sm font-semibold text-[#111827]">
      {label}
      <input name={name} type="date" defaultValue={defaultValue} className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#F97316]" />
    </label>
  );
}
