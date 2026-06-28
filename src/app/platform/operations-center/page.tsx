import type { Prisma, SupportSessionStatus } from "@prisma/client";
import { Activity, Clock, FileText, LifeBuoy, Search, Timer, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SupportCountdown } from "@/components/SupportCountdown";
import { TerminateSupportSessionButton } from "@/components/TerminateSupportSessionButton";
import { EmptyState, MetricCard, SectionCard } from "@/components/ui";
import { joinSupportSessionAction, endSupportSessionAction } from "@/app/platform/businesses/support-actions";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { expireStaleSupportSessions } from "@/lib/support-sessions";
import { requireRole } from "@/lib/session";

type OperationsSearchParams = {
  q?: string;
  status?: string;
  mode?: string;
  from?: string;
  to?: string;
};

type SupportSessionListItem = Prisma.SupportSessionGetPayload<{
  include: {
    business: { select: { name: true; uuid: true } };
    adminUser: { select: { name: true; email: true } };
    _count: { select: { activities: true } };
  };
}>;

const validStatuses: SupportSessionStatus[] = ["ACTIVE", "ENDED", "EXPIRED"];

function getParam(params: OperationsSearchParams, key: keyof OperationsSearchParams) {
  return typeof params[key] === "string" ? params[key]?.trim() ?? "" : "";
}

function parseDate(value: string, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDurationMs(session: { startedAt: Date; endedAt: Date | null; expiresAt: Date }) {
  const end = session.endedAt ?? session.expiresAt;
  return Math.max(0, end.getTime() - session.startedAt.getTime());
}

function formatDuration(ms: number) {
  if (ms <= 0) {
    return "0 minutes";
  }

  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes} ${totalMinutes === 1 ? "minute" : "minutes"}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getStatusTone(status: SupportSessionStatus) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "EXPIRED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function commonReason(sessions: SupportSessionListItem[]) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    counts.set(session.reason, (counts.get(session.reason) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No sessions yet";
}

export default async function OperationsCenterPage({
  searchParams,
}: {
  searchParams: Promise<OperationsSearchParams>;
}) {
  const currentUser = await requireRole("PLATFORM_OWNER");
  await expireStaleSupportSessions();

  const params = await searchParams;
  const query = getParam(params, "q");
  const status = validStatuses.includes(params.status as SupportSessionStatus) ? (params.status as SupportSessionStatus) : "";
  const mode = params.mode === "read-only" || params.mode === "edit" ? params.mode : "";
  const from = parseDate(getParam(params, "from"));
  const to = parseDate(getParam(params, "to"), true);

  const startedAt: Prisma.DateTimeFilter = {};
  if (from) {
    startedAt.gte = from;
  }
  if (to) {
    startedAt.lte = to;
  }

  const where: Prisma.SupportSessionWhereInput = {
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

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [sessions, allSessions] = await Promise.all([
    prisma.supportSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        business: { select: { name: true, uuid: true } },
        adminUser: { select: { name: true, email: true } },
        _count: { select: { activities: true } },
      },
    }),
    prisma.supportSession.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        business: { select: { name: true, uuid: true } },
        adminUser: { select: { name: true, email: true } },
        _count: { select: { activities: true } },
      },
    }),
  ]);

  const activeSessions = sessions.filter((session) => session.status === "ACTIVE" && !session.endedAt && session.expiresAt > now);
  const recentSessions = sessions.filter((session) => session.status !== "ACTIVE" || session.endedAt || session.expiresAt <= now);
  const completedToday = allSessions.filter((session) => session.endedAt && session.endedAt >= todayStart).length;
  const completedDurations = allSessions.filter((session) => session.endedAt || session.status === "EXPIRED").map(getDurationMs);
  const averageDuration = completedDurations.length
    ? completedDurations.reduce((total, duration) => total + duration, 0) / completedDurations.length
    : 0;
  const longestDuration = completedDurations.length ? Math.max(...completedDurations) : 0;

  return (
    <DashboardShell
      user={currentUser}
      eyebrow="System Administrator"
      title="Operations Center"
      headerAside={(
        <Link href="/platform/operations-center/support/start" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600">
          Start Support Session
        </Link>
      )}
    >
      <div className="grid gap-6">
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-2 shadow-sm">
          <div className="grid gap-2 md:grid-cols-4">
            <TabItem label="Support" active />
            <TabItem label="Compliance" comingSoon />
            <TabItem label="Platform Health" comingSoon />
            <TabItem label="Background Jobs" comingSoon />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Active Sessions" value={activeSessions.length} helper="Live support access" icon={<LifeBuoy className="h-5 w-5" />} tone="danger" />
          <MetricCard label="Completed Today" value={completedToday} helper="Ended sessions" icon={<Activity className="h-5 w-5" />} tone="success" />
          <MetricCard label="Average Duration" value={formatDuration(averageDuration)} helper="Completed sessions" icon={<Clock className="h-5 w-5" />} />
          <MetricCard label="Longest Session" value={formatDuration(longestDuration)} helper="Historical maximum" icon={<Timer className="h-5 w-5" />} tone="warning" />
          <MetricCard label="Common Reason" value={<span className="text-base">{commonReason(allSessions)}</span>} helper="Most frequent note" icon={<FileText className="h-5 w-5" />} />
          <MetricCard label="Total Sessions" value={allSessions.length} helper="All support access" icon={<Users className="h-5 w-5" />} tone="info" />
        </section>

        <SectionCard title="Search & Filters" description="Find support sessions by business, administrator, reason, status, mode, or date range.">
          <form className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_160px_160px_160px_auto_auto] lg:items-end">
            <label className="text-sm font-semibold text-[#111827]">
              Search
              <div className="mt-1 flex min-w-0 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3">
                <Search className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
                <input name="q" defaultValue={query} placeholder="Business, administrator, reason" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
            </label>
            <SelectField label="Status" name="status" defaultValue={status}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
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

        <SectionCard title="Active Support Sessions" description="Live support sessions with emergency controls.">
          {activeSessions.length ? (
            <div className="grid gap-3">
              {activeSessions.map((session) => (
                <SupportSessionCard key={session.id} session={session} active />
              ))}
            </div>
          ) : (
            <EmptyState title="No active support sessions." description="Active support sessions will appear here as soon as a Platform Administrator starts or joins one." />
          )}
        </SectionCard>

        <SectionCard title="Recent Support Sessions" description="Completed and expired support sessions with activity counts and reports.">
          {recentSessions.length ? (
            <div className="grid gap-3">
              {recentSessions.map((session) => (
                <SupportSessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState title="No recent support sessions." description="Ended and expired support sessions matching the current filters will appear here." />
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

function TabItem({ label, active, comingSoon }: { label: string; active?: boolean; comingSoon?: boolean }) {
  return (
    <div className={`rounded-md px-4 py-3 text-sm font-semibold ${active ? "bg-[#F97316] text-white" : "bg-[#F8FAFC] text-[#64748B]"}`}>
      <span>{label}</span>
      {comingSoon ? <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-[#64748B]">Coming Soon</span> : null}
    </div>
  );
}

function SupportSessionCard({ session, active = false }: { session: SupportSessionListItem; active?: boolean }) {
  const adminName = session.adminUser.name ?? session.adminUser.email;

  return (
    <article className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] xl:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Business</p>
          <h3 className="mt-1 break-words text-base font-bold text-[#0F172A]">{session.business.name}</h3>
          <p className="mt-2 text-sm text-[#64748B]">Administrator: <span className="font-semibold text-[#334155]">{adminName}</span></p>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Started" value={formatDateTime(session.startedAt)} />
          <Info label={active ? "Remaining" : "Duration"} value={active ? <SupportCountdown expiresAt={session.expiresAt.toISOString()} /> : formatDuration(getDurationMs(session))} />
          <Info label="Mode" value={session.readOnly ? "Read Only" : "Edit"} />
          <Info label="Status" value={<span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusTone(session.status)}`}>{session.status}</span>} />
        </dl>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Reason</p>
          <p className="mt-1 break-words text-sm font-medium text-[#334155]">{session.reason}</p>
          <p className="mt-2 text-xs font-semibold text-[#64748B]">{session._count.activities} activities</p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {active ? (
            <form action={joinSupportSessionAction}>
              <CsrfInput scope="platform:support-sessions" />
              <input type="hidden" name="supportSessionId" value={session.id} />
              <input type="hidden" name="businessUuid" value={session.business.uuid} />
              <button type="submit" className="inline-flex min-h-10 items-center rounded-md bg-[#F97316] px-3 text-sm font-semibold text-white transition hover:bg-orange-600">
                Open Session
              </button>
            </form>
          ) : null}
          <Link href={`/platform/operations-center/support/${session.id}`} className="inline-flex min-h-10 items-center rounded-md border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
            {active ? "View Details" : "View Report"}
          </Link>
          {active ? (
            <form action={endSupportSessionAction}>
              <CsrfInput scope="platform:support-sessions" />
              <input type="hidden" name="supportSessionId" value={session.id} />
              <input type="hidden" name="businessUuid" value={session.business.uuid} />
              <input type="hidden" name="redirectTo" value="/platform/operations-center" />
              <TerminateSupportSessionButton businessName={session.business.name} adminName={adminName} reason={session.reason} />
            </form>
          ) : null}
        </div>
      </div>
    </article>
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
