import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ShieldAlert } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SupportCountdown } from "@/components/SupportCountdown";
import { TerminateSupportSessionButton } from "@/components/TerminateSupportSessionButton";
import { EmptyState, MetricCard, SectionCard, StatusBadge } from "@/components/ui";
import { endSupportSessionAction } from "@/app/platform/businesses/support-actions";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { expireStaleSupportSessions } from "@/lib/support-sessions";

function formatDuration(startedAt: Date, endedAt: Date | null, expiresAt: Date) {
  const end = endedAt ?? expiresAt;
  const minutes = Math.max(0, Math.round((end.getTime() - startedAt.getTime()) / 60000));

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function friendlyActivityType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SupportSessionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireRole("PLATFORM_OWNER");
  await expireStaleSupportSessions();

  const { id } = await params;
  const supportSessionId = Number(id);
  if (!Number.isInteger(supportSessionId) || supportSessionId <= 0) {
    notFound();
  }

  const session = await prisma.supportSession.findUnique({
    where: { id: supportSessionId },
    include: {
      business: { select: { name: true, uuid: true } },
      adminUser: { select: { name: true, email: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      _count: { select: { activities: true } },
    },
  });

  if (!session) {
    notFound();
  }

  const adminName = session.adminUser.name ?? session.adminUser.email;
  const isActive = session.status === "ACTIVE" && !session.endedAt && session.expiresAt > new Date();

  return (
    <DashboardShell user={currentUser} eyebrow="System Administrator" title="Support Session Report">
      <div className="grid gap-6">
        <div data-support-session-mobile-view className="grid gap-4 lg:hidden">
          <Link href="/platform/operations-center" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Operations Center
          </Link>

          <SectionCard
            title="Support Session"
            description="Mobile view shows only urgent support controls. Detailed reports and audit timelines are available on desktop."
            actions={<StatusBadge tone={isActive ? "success" : session.status === "EXPIRED" ? "warning" : "neutral"}>{session.status}</StatusBadge>}
          >
            <dl className="grid gap-3">
              <SummaryItem label="Business" value={session.business.name} />
              <SummaryItem label="Reason" value={session.reason} />
              <SummaryItem label={isActive ? "Countdown" : "Duration"} value={isActive ? "Live countdown active" : formatDuration(session.startedAt, session.endedAt, session.expiresAt)} />
              <SummaryItem label="Mode" value={session.readOnly ? "Read Only" : "Edit Mode"} />
            </dl>
            {isActive ? (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">Remaining</p>
                <p className="mt-1 text-lg font-bold text-[#0F172A]">
                  <SupportCountdown expiresAt={session.expiresAt.toISOString()} />
                </p>
                <form action={endSupportSessionAction} className="mt-4">
                  <CsrfInput scope="platform:support-sessions" />
                  <input type="hidden" name="supportSessionId" value={session.id} />
                  <input type="hidden" name="businessUuid" value={session.business.uuid} />
                  <input type="hidden" name="redirectTo" value="/platform/operations-center" />
                  <TerminateSupportSessionButton businessName={session.business.name} adminName={adminName} reason={session.reason} label="End Session" />
                </form>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Desktop Report" description="Support notes, export, and long audit timelines are intentionally hidden on mobile.">
            <p className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-semibold text-[#475569]">Available on desktop.</p>
          </SectionCard>
        </div>

        <div className="hidden gap-6 lg:grid">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/platform/operations-center" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Operations Center
            </Link>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Support Audit
            </span>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Business" value={<span className="text-lg">{session.business.name}</span>} helper="Workspace viewed" />
            <MetricCard label="Administrator" value={<span className="text-lg">{adminName}</span>} helper={session.adminUser.email} />
            <MetricCard label="Duration" value={formatDuration(session.startedAt, session.endedAt, session.expiresAt)} helper={`${formatDateTime(session.startedAt)} started`} />
            <MetricCard label="Activity Count" value={session._count.activities} helper="Recorded support events" tone="info" />
          </section>

          <SectionCard
            title="Session Summary"
            description="Operational details for this support access window."
            actions={<span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs font-bold uppercase text-[#64748B]">{session.status}</span>}
          >
            <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SummaryItem label="Started" value={formatDateTime(session.startedAt)} />
              <SummaryItem label="Ended" value={session.endedAt ? formatDateTime(session.endedAt) : "Still active or expired by time"} />
              <SummaryItem label="Mode" value={session.readOnly ? "Read Only" : "Edit Mode"} />
              <SummaryItem label="Reason" value={session.reason} />
              <SummaryItem label="Session ID" value={`#${session.id}`} />
              <SummaryItem label="Business ID" value={session.business.uuid} />
            </dl>
          </SectionCard>

          <SectionCard title="Support Notes" description="Administrator summary recorded when the session was ended.">
            {session.supportSummary ? (
              <p className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#334155]">{session.supportSummary}</p>
            ) : (
              <EmptyState title="No support summary recorded yet." description="Active or expired sessions may not have a final support summary until they are manually ended." />
            )}
          </SectionCard>

          <SectionCard title="Timeline" description="Recent support activity recorded during this session.">
            {session.activities.length ? (
              <ol className="grid gap-3">
                {session.activities.map((activity) => (
                  <li key={activity.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F172A]">{friendlyActivityType(activity.activityType)}</p>
                        <p className="mt-1 break-words text-sm leading-6 text-[#334155]">{activity.description}</p>
                        {activity.path ? <p className="mt-1 break-all font-mono text-xs text-[#64748B]">{activity.path}</p> : null}
                      </div>
                      <time className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{formatDateTime(activity.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No activity recorded." description="Support activity appears after the administrator views pages or lifecycle events occur." />
            )}
          </SectionCard>

          <SectionCard title="Export" description="Support report export will be added in a later milestone.">
            <button disabled className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-md border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-sm font-semibold text-[#64748B]">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export unavailable
            </button>
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#0F172A]">{value}</dd>
    </div>
  );
}
