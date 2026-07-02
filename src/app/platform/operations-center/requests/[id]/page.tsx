import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SupportCountdown } from "@/components/SupportCountdown";
import { TerminateSupportSessionButton } from "@/components/TerminateSupportSessionButton";
import { EmptyState, SectionCard, StatusBadge } from "@/components/ui";
import { endSupportSessionAction, joinSupportSessionAction } from "@/app/platform/businesses/support-actions";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { expireStaleSupportRequests, expireStaleSupportSessions } from "@/lib/support-sessions";

export default async function SupportRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireRole("PLATFORM_OWNER");
  await Promise.all([expireStaleSupportRequests(), expireStaleSupportSessions()]);

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) notFound();

  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    include: {
      business: { select: { id: true, name: true, uuid: true, supportAccessPolicy: true } },
      requestedByUser: { select: { name: true, email: true } },
      reviewedByUser: { select: { name: true, email: true } },
      supportSession: {
        include: {
          adminUser: { select: { name: true, email: true } },
          activities: { orderBy: { createdAt: "desc" }, take: 20 },
          _count: { select: { activities: true } },
        },
      },
    },
  });

  if (!request) notFound();

  const requester = request.requestedByUser.name ?? request.requestedByUser.email;
  const reviewer = request.reviewedByUser ? request.reviewedByUser.name ?? request.reviewedByUser.email : "Not reviewed";
  const session = request.supportSession;
  const sessionAdmin = session ? session.adminUser.name ?? session.adminUser.email : null;
  const isSessionActive = session ? session.status === "ACTIVE" && !session.endedAt && session.expiresAt > new Date() : false;

  return (
    <DashboardShell user={currentUser} eyebrow="System Administrator" title="Support Request Details">
      <div className="grid gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#64748B]">
            <Link href="/platform/operations-center" className="inline-flex items-center gap-2 transition hover:text-[#F97316] hover:underline">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Operations Center
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-[#0F172A]">{request.business.name}</span>
          </nav>
          <Link href={`/platform/businesses/${request.business.uuid}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
            Open Business
          </Link>
        </div>

        <section className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="break-words text-2xl font-black tracking-tight text-[#0F172A]">{request.business.name}</h1>
                <StatusBadge tone={request.status === "PENDING" ? "warning" : request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "danger" : "neutral"}>{request.status}</StatusBadge>
                {request.emergency ? <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold uppercase text-red-700">Emergency</span> : null}
              </div>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">{request.readOnly ? "Read Only" : "Full Access"} mode</p>
            </div>
            <RequestActions requestId={request.id} businessId={request.business.id} businessUuid={request.business.uuid} businessName={request.business.name} session={session} isSessionActive={isSessionActive} sessionAdmin={sessionAdmin} reason={request.reason} />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
            <SectionCard title="Request Information" description="Support access request details and approval status.">
              <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <SummaryItem label="Reason" value={request.reason} />
                <SummaryItem label="Requested By" value={requester} />
                <SummaryItem label="Requested Time" value={formatDateTime(request.createdAt)} />
                <SummaryItem label="Expiration" value={request.status === "PENDING" ? <SupportCountdown expiresAt={request.expiresAt.toISOString()} /> : formatDateTime(request.expiresAt)} />
                <SummaryItem label="Duration" value={`${request.durationMinutes} minutes`} />
                <SummaryItem label="Approval Status" value={request.status} />
                <SummaryItem label="Reviewed By" value={reviewer} />
                <SummaryItem label="Reviewed At" value={request.reviewedAt ? formatDateTime(request.reviewedAt) : "Not reviewed"} />
                <SummaryItem label="Response Note" value={request.responseNote ?? "No response note"} />
              </dl>
            </SectionCard>

            <SectionCard title="Support Session" description="Linked support session and activity timeline.">
              {session ? (
                <div className="grid gap-4">
                  <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryItem label="Session Status" value={session.status} />
                    <SummaryItem label="Started By" value={sessionAdmin ?? "Unknown"} />
                    <SummaryItem label="Mode" value={session.readOnly ? "Read Only" : "Full Access"} />
                    <SummaryItem label="Started" value={formatDateTime(session.startedAt)} />
                    <SummaryItem label="Expires" value={formatDateTime(session.expiresAt)} />
                    <SummaryItem label="Activities" value={session._count.activities.toString()} />
                  </dl>
                  {session.activities.length ? (
                    <ol className="grid gap-3">
                      {session.activities.map((activity) => (
                        <li key={activity.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0F172A]">{activity.activityType.replaceAll("_", " ").toLowerCase()}</p>
                              <p className="mt-1 break-words text-sm leading-6 text-[#334155]">{activity.description}</p>
                              {activity.path ? <p className="mt-1 break-all font-mono text-xs text-[#64748B]">{activity.path}</p> : null}
                            </div>
                            <time className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{formatDateTime(activity.createdAt)}</time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState title="No session activity yet." description="Activity appears after a support session is joined or pages are viewed." />
                  )}
                </div>
              ) : (
                <EmptyState title="No support session linked." description="Pending, rejected, and expired requests may not have a support session." />
              )}
            </SectionCard>
          </div>

          <SectionCard title="Workflow Notes" description="Platform actions preserve the existing approval policy.">
            <div className="space-y-3 text-sm leading-6 text-[#475569]">
              <p>Business Owner approval and rejection remain controlled by the Business Owner support history workflow.</p>
              <p>System Administrators can open the business, start support through the existing Operations flow, or join/end a linked active session.</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  );
}

function RequestActions({
  requestId,
  businessId,
  businessUuid,
  businessName,
  session,
  isSessionActive,
  sessionAdmin,
  reason,
}: {
  requestId: number;
  businessId: number;
  businessUuid: string;
  businessName: string;
  session: {
    id: number;
    status: string;
    businessId: number;
    reason: string;
  } | null;
  isSessionActive: boolean;
  sessionAdmin: string | null;
  reason: string;
}) {
  return (
    <aside className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
      <Link href={`/platform/businesses/${businessUuid}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
        Open Business
      </Link>
      <Link href={`/platform/operations-center/support/start?businessId=${businessId}`} className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600">
        Start Session
      </Link>
      {session ? (
        <Link href={`/platform/operations-center/support/${session.id}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
          View Session
        </Link>
      ) : null}
      {session && isSessionActive ? (
        <form action={joinSupportSessionAction}>
          <CsrfInput scope="platform:support-sessions" />
          <input type="hidden" name="supportSessionId" value={session.id} />
          <input type="hidden" name="businessUuid" value={businessUuid} />
          <button type="submit" className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 sm:w-auto">
            Join Session
          </button>
        </form>
      ) : null}
      {session && isSessionActive ? (
        <form action={endSupportSessionAction}>
          <CsrfInput scope="platform:support-sessions" />
          <input type="hidden" name="supportSessionId" value={session.id} />
          <input type="hidden" name="businessUuid" value={businessUuid} />
          <input type="hidden" name="redirectTo" value={`/platform/operations-center/requests/${requestId}`} />
          <TerminateSupportSessionButton businessName={businessName} adminName={sessionAdmin ?? "Unknown"} reason={reason} label="End Session" />
        </form>
      ) : null}
    </aside>
  );
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#0F172A]">{value}</dd>
    </div>
  );
}
