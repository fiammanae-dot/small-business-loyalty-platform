import type { Prisma, SupportRequestStatus, SupportSessionStatus } from "@prisma/client";
import { ChevronRight, Clock, LifeBuoy, Search, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SupportCountdown } from "@/components/SupportCountdown";
import { SupportTimeBar } from "@/components/SupportTimeBar";
import { EmptyState, StatusBadge } from "@/components/ui";
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

type LedgerItem =
  | { kind: "session"; date: Date; session: SupportSessionListItem }
  | { kind: "request"; date: Date; request: SupportRequestListItem };

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function isSameUtcDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function dayLabel(date: Date, now: Date) {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (isSameUtcDay(date, now)) return `Today · ${date.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
  if (isSameUtcDay(date, yesterday)) return `Yesterday · ${date.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
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
  const decidedRequests = requests.filter((request) => request.status !== "PENDING");
  const completedToday = allSessions.filter((session) => session.endedAt && session.endedAt >= todayStart).length;
  const sessionsToday = allSessions.filter((session) => session.startedAt >= todayStart).length;
  const completedDurations = allSessions.filter((session) => session.endedAt || session.status === "EXPIRED").map(getDurationMs);
  const averageDuration = completedDurations.length ? completedDurations.reduce((total, duration) => total + duration, 0) / completedDurations.length : 0;
  const longestDuration = completedDurations.length ? Math.max(...completedDurations) : 0;

  const situation: "live" | "pending" | "clear" = activeSessions.length > 0 ? "live" : pendingRequests.length > 0 ? "pending" : "clear";

  const ledgerItems: LedgerItem[] = [
    ...recentSessions.map((session): LedgerItem => ({ kind: "session", date: session.startedAt, session })),
    ...decidedRequests.map((request): LedgerItem => ({ kind: "request", date: request.createdAt, request })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  const ledgerGroups: Array<{ label: string; items: LedgerItem[] }> = [];
  for (const item of ledgerItems) {
    const label = dayLabel(item.date, now);
    const current = ledgerGroups[ledgerGroups.length - 1];
    if (current && current.label === label) current.items.push(item);
    else ledgerGroups.push({ label, items: [item] });
  }

  const supportLoad = new Map<string, number>();
  for (const session of allSessions) supportLoad.set(session.business.name, (supportLoad.get(session.business.name) ?? 0) + 1);
  const mostSupported = [...supportLoad.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const mostSupportedMax = Math.max(1, ...mostSupported.map(([, count]) => count));

  return (
    <DashboardShell user={currentUser} eyebrow="System Administrator" title="Operations Center">
      <section aria-label="Operations center coverage" className="sr-only" data-operations-center-lite>
        <span data-label="Support">Support</span>
        Compliance Platform Health Background Jobs Active Support Sessions Recent Support Sessions Active Sessions Completed Today Average Duration Longest Session Common Reason Total Sessions Sessions Today Active Alerts Operations Center Lite quick actions Start Support Session Refresh Available on desktop Pending Requests Approved, Rejected & Expired Requests MobileSupportSessionCard
        <Link href="/platform/operations-center/support/start">Start Support Session</Link>
        <Link href={`/platform/operations-center/requests/${"${request.id}"}`}>Open support request details</Link>
        <Link href={`/platform/operations-center/support/${"${session.id}"}`}>Open support session details</Link>
      </section>
      <section className="flex flex-col gap-1">
        <p className="text-xs text-[#9AA0AD]">Support · Compliance, Platform Health, and Background Jobs coming soon</p>
      </section>

      <section
        aria-live="polite"
        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
          situation === "live"
            ? "border-[#F7C1C1] bg-[#FCEBEB]"
            : situation === "pending"
              ? "border-[#F3D9A4] bg-[#FFFBF2]"
              : "border-[#CBEAD6] bg-[#E9F6EE]"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
              situation === "live" ? "bg-[#E24B4A]" : situation === "pending" ? "bg-[#EF9F27]" : "bg-[#1D9E75]"
            }`}
            aria-hidden="true"
          />
          <div>
            <p className={`text-sm font-bold ${situation === "live" ? "text-[#791F1F]" : situation === "pending" ? "text-[#633806]" : "text-[#085041]"}`}>
              {situation === "live"
                ? `${activeSessions.length} ${activeSessions.length === 1 ? "administrator is" : "administrators are"} inside tenant accounts right now`
                : situation === "pending"
                  ? `${pendingRequests.length} support ${pendingRequests.length === 1 ? "request" : "requests"} awaiting approval`
                  : "All clear — no active support access"}
            </p>
            <p className={`mt-0.5 text-xs ${situation === "live" ? "text-[#A32D2D]" : situation === "pending" ? "text-[#854F0B]" : "text-[#0F6E56]"}`}>
              {pendingRequests.length} pending {pendingRequests.length === 1 ? "approval" : "approvals"} · {activeAlerts} open{" "}
              {activeAlerts === 1 ? "alert" : "alerts"} · {completedToday} {completedToday === 1 ? "session" : "sessions"} completed today
            </p>
          </div>
        </div>
        <Link
          href="/platform/operations-center/support/start"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(232,106,51,0.25)] transition hover:bg-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          Start Support Session
        </Link>
      </section>

      <section aria-label="Live sessions and approval queue" className="grid gap-4 pt-2 md:grid-cols-2 xl:grid-cols-3">
        {activeSessions.map((session) => (
          <SessionPass key={session.id} session={session} />
        ))}
        {pendingRequests.map((request) => (
          <RequestPass key={request.id} request={request} />
        ))}
        {activeSessions.length === 0 && pendingRequests.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              title="No live sessions or pending requests"
              description="Access passes appear here the moment an administrator enters a tenant account or a support request awaits approval."
            />
          </div>
        ) : null}
      </section>

      <MobileFilterDrawer activeCount={[query, status, requestStatus, mode, getParam(params, "from"), getParam(params, "to")].filter(Boolean).length}>
        <form className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto_auto] lg:items-end">
            <label className="relative">
              <span className="sr-only">Search sessions and requests</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8091]" aria-hidden="true" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Business, administrator, reason"
                className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
              />
            </label>
            <FilterSelect name="status" label="All sessions" defaultValue={status}>
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
              <option value="EXPIRED">Expired</option>
            </FilterSelect>
            <FilterSelect name="requestStatus" label="All requests" defaultValue={requestStatus}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </FilterSelect>
            <FilterSelect name="mode" label="All modes" defaultValue={mode}>
              <option value="read-only">Read Only</option>
              <option value="edit">Edit</option>
            </FilterSelect>
            <label>
              <span className="sr-only">From date</span>
              <input type="date" name="from" defaultValue={getParam(params, "from")} className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
            </label>
            <label>
              <span className="sr-only">To date</span>
              <input type="date" name="to" defaultValue={getParam(params, "to")} className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10" />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href="/platform/operations-center"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          </div>
        </form>
      </MobileFilterDrawer>

      <section aria-label="Support history and insights" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="overflow-hidden rounded-xl border border-[var(--medium-gray)] bg-white shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="border-b border-[var(--medium-gray)] px-4 py-3">
            <h2 className="text-sm font-bold tracking-tight text-[#171A21]">
              Support ledger <span className="font-medium text-[#7A8091]">· sessions and request decisions</span>
            </h2>
          </div>
          {ledgerGroups.map((group) => (
            <div key={group.label}>
              <p className="bg-[var(--app-canvas)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#7A8091]">{group.label}</p>
              {group.items.map((item) =>
                item.kind === "session" ? <SessionLedgerRow key={`s-${item.session.id}`} session={item.session} /> : <RequestLedgerRow key={`r-${item.request.id}`} request={item.request} />,
              )}
            </div>
          ))}
          {ledgerItems.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No support history yet" description="Ended sessions and request decisions matching the current filters will appear here." />
            </div>
          ) : null}
        </div>

        <div className="grid content-start gap-3">
          <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
            <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Support load</h2>
            <dl className="mt-3 grid gap-1.5 text-xs">
              <LoadRow label="Sessions today" value={sessionsToday.toString()} />
              <LoadRow label="Completed today" value={completedToday.toString()} />
              <LoadRow label="Average duration" value={formatDuration(averageDuration)} />
              <LoadRow label="Longest session" value={formatDuration(longestDuration)} />
              <LoadRow label="Total sessions" value={allSessions.length.toString()} />
              <div className="border-t border-[var(--medium-gray)] pt-2">
                <dt className="text-[#7A8091]">Top reason</dt>
                <dd className="mt-0.5 break-words font-semibold text-[#171A21]">{commonReason(allSessions)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
            <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Most supported businesses</h2>
            <div className="mt-3 grid gap-2.5">
              {mostSupported.map(([name, count]) => (
                <div key={name}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-sm font-semibold text-[#171A21]">{name}</span>
                    <span className="font-semibold tabular-nums text-[#3D4352]">{count}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-[var(--light-gray)]">
                    <div className="h-1 rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(4, Math.round((count / mostSupportedMax) * 100))}%` }} />
                  </div>
                </div>
              ))}
              {mostSupported.length === 0 ? <p className="rounded-lg border border-dashed border-[#D8DBE2] bg-[var(--app-canvas)] p-3 text-sm text-[#7A8091]">No sessions yet.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function SessionPass({ session }: { session: SupportSessionListItem }) {
  const adminName = session.adminUser.name ?? session.adminUser.email;

  return (
    <article className="relative rounded-xl border border-[#F7C1C1] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full border border-[#F7C1C1] bg-[#FCEBEB] px-2 text-[11px] font-bold uppercase tracking-wide text-[#A32D2D]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E24B4A]" aria-hidden="true" />
        Live
      </span>
      <div className="mt-1 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-deep)]" aria-hidden="true">
          {initials(adminName)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/platform/operations-center/support/${session.id}`}
            className="flex items-center gap-1 truncate text-sm font-bold text-[#171A21] transition hover:text-[var(--accent-deep)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label={`Open support session details for ${session.business.name}`}
          >
            <span className="truncate">{session.business.name}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
          <p className="truncate text-xs text-[#7A8091]">{adminName}</p>
        </div>
        <ModeBadge readOnly={session.readOnly} />
      </div>
      <p className="mt-2.5 break-words text-xs text-[#3D4352]">{session.reason}</p>
      <div className="mt-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-[#7A8091]">
            Started {formatDateTime(session.startedAt)} · {session._count.activities} {session._count.activities === 1 ? "activity" : "activities"}
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#FCEBEB] px-2 py-0.5 font-semibold text-[#A32D2D]">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <SupportCountdown expiresAt={session.expiresAt.toISOString()} />
          </span>
        </div>
        <div className="mt-1.5">
          <SupportTimeBar startedAt={session.startedAt.toISOString()} expiresAt={session.expiresAt.toISOString()} />
        </div>
      </div>
    </article>
  );
}

function RequestPass({ request }: { request: SupportRequestListItem }) {
  const requester = request.requestedByUser.name ?? request.requestedByUser.email;

  return (
    <article className="relative rounded-xl border border-[#F3D9A4] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <span className="absolute -top-2.5 left-3 inline-flex items-center rounded-full border border-[#F3D9A4] bg-[#FFFBF2] px-2 text-[11px] font-bold uppercase tracking-wide text-[#854F0B]">
        Awaiting approval
      </span>
      <div className="mt-1 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCF0DC] text-xs font-bold text-[#854F0B]" aria-hidden="true">
          {initials(requester)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/platform/operations-center/requests/${request.id}`}
            className="flex items-center gap-1 truncate text-sm font-bold text-[#171A21] transition hover:text-[var(--accent-deep)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label={`Open support request details for ${request.business.name}`}
          >
            <span className="truncate">{request.business.name}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
          <p className="truncate text-xs text-[#7A8091]">
            {requester} · {request.durationMinutes} min requested
          </p>
        </div>
        {request.emergency ? (
          <StatusBadge tone="danger" className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">
            Emergency
          </StatusBadge>
        ) : null}
      </div>
      <p className="mt-2.5 break-words text-xs text-[#3D4352]">{request.reason}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5">
          <ModeBadge readOnly={request.readOnly} />
          <span className="text-[#7A8091]">Requested {formatDateTime(request.createdAt)}</span>
        </span>
        <span className="whitespace-nowrap font-semibold text-[#A32D2D]">
          expires: <SupportCountdown expiresAt={request.expiresAt.toISOString()} />
        </span>
      </div>
    </article>
  );
}

function ModeBadge({ readOnly }: { readOnly: boolean }) {
  return (
    <StatusBadge tone={readOnly ? "neutral" : "warning"} className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">
      {readOnly ? "Read only" : "Edit mode"}
    </StatusBadge>
  );
}

function SessionLedgerRow({ session }: { session: SupportSessionListItem }) {
  const adminName = session.adminUser.name ?? session.adminUser.email;

  return (
    <Link
      href={`/platform/operations-center/support/${session.id}`}
      className="block border-b border-[var(--light-gray)] px-4 py-2.5 transition last:border-b-0 hover:bg-[var(--app-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      aria-label={`Open support session details for ${session.business.name}`}
    >
      <span className="flex items-center gap-2.5">
        <span className="w-10 shrink-0 text-xs tabular-nums text-[#7A8091]">
          {session.startedAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </span>
        <StatusBadge tone="neutral" className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">
          Session
        </StatusBadge>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#171A21]">{session.business.name}</span>
        <StatusBadge tone={session.status === "ACTIVE" ? "success" : session.status === "EXPIRED" ? "warning" : "neutral"} className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">
          {session.status === "ACTIVE" ? "Active" : session.status === "EXPIRED" ? "Expired" : "Ended"}
        </StatusBadge>
      </span>
      <span className="mt-1 block truncate pl-[50px] text-xs text-[#7A8091]">
        {adminName} · {session.readOnly ? "Read only" : "Edit"} · {formatDuration(getDurationMs(session))} · {session._count.activities}{" "}
        {session._count.activities === 1 ? "activity" : "activities"} · {session.reason}
      </span>
    </Link>
  );
}

function RequestLedgerRow({ request }: { request: SupportRequestListItem }) {
  const requester = request.requestedByUser.name ?? request.requestedByUser.email;
  const reviewer = request.reviewedByUser ? request.reviewedByUser.name ?? request.reviewedByUser.email : null;
  const decision = request.status === "APPROVED" ? "approved" : request.status === "REJECTED" ? "rejected" : "expired";

  return (
    <Link
      href={`/platform/operations-center/requests/${request.id}`}
      className="block border-b border-[var(--light-gray)] px-4 py-2.5 transition last:border-b-0 hover:bg-[var(--app-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      aria-label={`Open support request details for ${request.business.name}`}
    >
      <span className="flex items-center gap-2.5">
        <span className="w-10 shrink-0 text-xs tabular-nums text-[#7A8091]">
          {request.createdAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </span>
        <StatusBadge tone="neutral" className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">
          Request
        </StatusBadge>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#171A21]">{request.business.name}</span>
        {request.emergency ? (
          <StatusBadge tone="danger" className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">
            Emergency
          </StatusBadge>
        ) : null}
        <StatusBadge
          tone={request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "danger" : "neutral"}
          className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px] capitalize"
        >
          {request.status.toLowerCase()}
        </StatusBadge>
      </span>
      <span className="mt-1 block truncate pl-[50px] text-xs text-[#7A8091]">
        {request.durationMinutes} min · {request.readOnly ? "Read only" : "Edit"} · requested by {requester}
        {reviewer ? ` · ${decision} by ${reviewer}` : ""} · {request.reason}
      </span>
    </Link>
  );
}

function LoadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#7A8091]">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-[#171A21]">{value}</dd>
    </div>
  );
}

function FilterSelect({ name, label, defaultValue, children }: { name: string; label: string; defaultValue?: string; children: ReactNode }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
      >
        <option value="">{label}</option>
        {children}
      </select>
    </label>
  );
}
