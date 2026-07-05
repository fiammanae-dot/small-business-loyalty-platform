import Link from "next/link";
import { Check, Clock, History, Hourglass, MessageCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState, MetricCard, SectionCard, StatusBadge } from "@/components/ui";
import { approveSupportRequestAction, rejectSupportRequestAction } from "@/app/platform/businesses/support-actions";
import { requireBusinessOwner } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { expireStaleSupportRequests } from "@/lib/support-sessions";

type SupportSession = {
  startedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  status: string;
  reason: string;
  supportSummary: string | null;
};

type SupportRequest = {
  id: number;
  reason: string;
  durationMinutes: number;
  readOnly: boolean;
  emergency: boolean;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  reviewedAt: Date | null;
  responseNote: string | null;
  requestedByUser: { name: string | null; email: string };
};

export default async function BusinessSupportHistoryPage() {
  const user = await requireBusinessOwner();
  await expireStaleSupportRequests();
  const [business, sessions, requests] = await Promise.all([
    prisma.business.findUnique({ where: { id: user.businessId }, select: { name: true } }),
    prisma.supportSession.findMany({ where: { businessId: user.businessId }, orderBy: { startedAt: "desc" }, select: { startedAt: true, expiresAt: true, endedAt: true, status: true, reason: true, supportSummary: true } }),
    prisma.supportRequest.findMany({ where: { businessId: user.businessId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, reason: true, durationMinutes: true, readOnly: true, emergency: true, status: true, expiresAt: true, createdAt: true, reviewedAt: true, responseNote: true, requestedByUser: { select: { name: true, email: true } } } }),
  ]);
  const pendingRequests = requests.filter((request) => request.status === "PENDING");
  const historyRequests = requests.filter((request) => request.status !== "PENDING");
  const approvedCount = requests.filter((request) => request.status === "APPROVED").length;
  const activeSession = sessions.find((session) => session.status === "ACTIVE") ?? null;
  const lastAccess = sessions[0]?.startedAt ?? null;
  const totalAccessMinutes = sessions.reduce(
    (sum, session) => sum + Math.max(0, Math.round(((session.endedAt ?? session.expiresAt).getTime() - session.startedAt.getTime()) / 60000)),
    0,
  );
  const whatsappSupportUrl = `https://wa.me/971505009707?text=${encodeURIComponent("Hello Loyalty Card UAE Support, I need help with my account.")}`;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Support History" hideWelcomeMessage>
      <div className="space-y-5 pb-24 md:pb-6">
        <div className="min-w-0">
          <p className="text-[13px] text-[#7A8091]">
            Review and control Loyalty Card UAE support access for {business?.name ?? "your business"}. Internal audit activity stays private to Platform Operations.
          </p>
        </div>

        <AccessStatusBanner activeSession={activeSession} lastAccess={lastAccess} />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Support access overview">
          <MetricCard label="Pending requests" value={pendingRequests.length.toLocaleString()} helper={pendingRequests.length > 0 ? "Need your decision" : "Nothing waiting"} icon={<Clock className="h-5 w-5 business-text" aria-hidden />} tone={pendingRequests.length > 0 ? "warning" : "neutral"} />
          <MetricCard label="Approved" value={approvedCount.toLocaleString()} helper="Access requests granted" icon={<Check className="h-5 w-5 business-text" aria-hidden />} />
          <MetricCard label="Sessions" value={sessions.length.toLocaleString()} helper="Recorded support visits" icon={<History className="h-5 w-5 business-text" aria-hidden />} />
          <MetricCard label="Access time" value={formatMinutesLabel(totalAccessMinutes)} helper="Total across sessions" icon={<Hourglass className="h-5 w-5 business-text" aria-hidden />} />
        </section>

        {pendingRequests.length ? (
          <section className="grid gap-3">
            <h2 className="text-base font-bold tracking-tight text-[#171A21]">Pending your approval</h2>
            {pendingRequests.map((request) => <PendingRequestCard key={request.id} request={request} />)}
          </section>
        ) : null}

        <SectionCard title="Request history" description="Approved, rejected, and expired support access requests.">
          {historyRequests.length ? (
            <div className="grid gap-2.5">{historyRequests.map((request) => <RequestHistoryRow key={request.id} request={request} />)}</div>
          ) : (
            <EmptyState title="No completed support requests." description="Support request decisions will appear here after approval, rejection, or expiry." />
          )}
        </SectionCard>

        <SectionCard title="Support sessions" description="Support access records visible to Business Owners.">
          {sessions.length ? (
            <div className="grid gap-3 md:grid-cols-2">{sessions.map((session) => <SessionCard key={`${session.startedAt.toISOString()}-${session.reason}`} session={session} />)}</div>
          ) : (
            <EmptyState
              title="No support access recorded."
              description="Loyalty Card UAE support sessions for your business will appear here after they are completed."
              action={<Link href="/dashboard" className="inline-flex min-h-10 items-center rounded-md border border-[#CBD5E1] px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">Back to Dashboard</Link>}
            />
          )}
        </SectionCard>
      </div>

      <a
        href={whatsappSupportUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact Loyalty Card UAE support on WhatsApp"
        title="Contact Loyalty Card UAE support on WhatsApp"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-[#1EBE5D] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30 md:bottom-6 md:right-6"
      >
        <MessageCircle aria-hidden="true" className="h-6 w-6" />
        <span className="hidden whitespace-nowrap md:inline">WhatsApp Support</span>
      </a>
    </DashboardShell>
  );
}

function AccessStatusBanner({ activeSession, lastAccess }: { activeSession: SupportSession | null; lastAccess: Date | null }) {
  if (activeSession) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#F3D9A4] bg-[#FFFBF2] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7E6C4] text-[#B25E09]">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#B25E09]">Support session active</p>
          <p className="text-xs text-[#9A6B18]">Access ends {formatDateTime(activeSession.expiresAt)}.</p>
        </div>
        <StatusBadge tone="warning">Active</StatusBadge>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#CBEAD6] bg-[#E9F6EE] p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#CBEAD6] text-[#1D7A46]">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1D7A46]">No active support access right now</p>
        <p className="text-xs text-[#4B7A5C]">Support can only access your workspace after you approve a request.</p>
      </div>
      {lastAccess ? <span className="shrink-0 text-xs text-[#4B7A5C]">Last access {formatShortDate(lastAccess)}</span> : null}
    </div>
  );
}

function PendingRequestCard({ request }: { request: SupportRequest }) {
  return (
    <article className="rounded-xl border-2 border-[#F3D9A4] bg-[#FFFBF2] p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="warning">Pending</StatusBadge>
        {request.emergency ? <StatusBadge tone="danger">Emergency</StatusBadge> : null}
        <StatusBadge tone="neutral">{request.readOnly ? "Read only" : "Edit mode"}</StatusBadge>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#B25E09]">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Expires {formatDateTime(request.expiresAt)}
        </span>
      </div>

      <p className="mt-3 break-words text-base font-semibold text-[#0F172A]">{request.reason}</p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <Info label="Requester" value={request.requestedByUser.name ?? request.requestedByUser.email} />
        <Info label="Duration" value={`${request.durationMinutes} min`} />
        <Info label="Requested" value={formatDateTime(request.createdAt)} />
        <Info label="Access mode" value={request.readOnly ? "Read only" : "Edit mode"} />
      </dl>

      <form action={approveSupportRequestAction} className="mt-4 flex flex-col gap-2 border-t border-[#F0E2C6] pt-4 sm:flex-row sm:items-center">
        <CsrfInput scope="platform:support-sessions" />
        <input type="hidden" name="supportRequestId" value={request.id} />
        <input type="hidden" name="redirectTo" value="/dashboard/support-history" />
        <input name="responseNote" placeholder="Optional note to support" className="h-10 flex-1 rounded-md border border-[#E5D9BE] bg-white px-3 text-sm outline-none focus:border-[#E8A94C]" />
        <div className="flex gap-2">
          <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700">
            <Check className="h-4 w-4" aria-hidden="true" /> Approve
          </button>
          <button type="submit" formAction={rejectSupportRequestAction} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50">
            Reject
          </button>
        </div>
      </form>
    </article>
  );
}

function RequestHistoryRow({ request }: { request: SupportRequest }) {
  const accent =
    request.status === "APPROVED"
      ? "border-l-emerald-500"
      : request.status === "REJECTED"
        ? "border-l-red-500"
        : "border-l-[#B4B2A9]";
  const meta = [
    request.requestedByUser.name ?? request.requestedByUser.email,
    `${request.durationMinutes} min`,
    request.readOnly ? "Read only" : "Edit mode",
    request.reviewedAt ? `reviewed ${formatShortDate(request.reviewedAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={`rounded-lg border border-[#E5E7EB] border-l-[3px] ${accent} p-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-[#0F172A]">{request.reason}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{meta}</p>
          {request.responseNote ? <p className="mt-1 text-xs text-[#64748B]">“{request.responseNote}”</p> : null}
        </div>
        <StatusBadge tone={request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "danger" : "neutral"}>{request.status}</StatusBadge>
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: SupportSession }) {
  return (
    <article className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0F172A]">{formatDateTime(session.startedAt)}</p>
        <StatusBadge tone={getSessionTone(session.status)}>{session.status}</StatusBadge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280]">
        <span className="inline-flex items-center gap-1"><Hourglass className="h-3.5 w-3.5" aria-hidden="true" />{formatSupportDuration(session.startedAt, session.endedAt ?? session.expiresAt)}</span>
        <span className="break-words">{session.reason}</span>
      </div>
      <p className="mt-3 break-words rounded-lg bg-[#FAFBFC] px-3 py-2 text-xs text-[#475569]">{session.supportSummary ?? "No summary recorded yet."}</p>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</dt>
      <dd className="mt-1 break-words text-[#334155]">{value}</dd>
    </div>
  );
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatSupportDuration(startedAt: Date, endedAt: Date) {
  return formatMinutesLabel(Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)));
}

function formatMinutesLabel(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function getSessionTone(status: string) {
  if (status === "ACTIVE") return "warning" as const;
  if (status === "ENDED") return "success" as const;
  return "neutral" as const;
}
