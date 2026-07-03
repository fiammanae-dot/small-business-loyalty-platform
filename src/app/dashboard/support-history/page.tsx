import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState, PageIntro, SectionCard, StatusBadge } from "@/components/ui";
import { approveSupportRequestAction, rejectSupportRequestAction } from "@/app/platform/businesses/support-actions";
import { requireBusinessOwner } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { expireStaleSupportRequests } from "@/lib/support-sessions";

export default async function BusinessSupportHistoryPage() {
  const user = await requireBusinessOwner();
  await expireStaleSupportRequests();
  const [business, sessions, requests] = await Promise.all([
    prisma.business.findUnique({ where: { id: user.businessId }, select: { name: true } }),
    prisma.supportSession.findMany({ where: { businessId: user.businessId }, orderBy: { startedAt: "desc" }, select: { startedAt: true, expiresAt: true, endedAt: true, status: true, reason: true, supportSummary: true } }),
    prisma.supportRequest.findMany({ where: { businessId: user.businessId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, reason: true, durationMinutes: true, readOnly: true, emergency: true, status: true, expiresAt: true, createdAt: true, reviewedAt: true, responseNote: true, requestedByUser: { select: { name: true, email: true } } } }),
  ]);
  const pendingRequests = requests.filter((request) => request.status === "PENDING");
  const whatsappSupportUrl = `https://wa.me/971505009707?text=${encodeURIComponent("Hello Loyalty Card UAE Support, I need help with my account.")}`;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Support History" hideWelcomeMessage>
      <div className="space-y-6">
        <PageIntro eyebrow="Support transparency" description={`Review Loyalty Card UAE support access for ${business?.name ?? "your business"}. Internal audit activity and administrator technical details stay private to Platform Operations.`} />

        <SectionCard title="Pending Support Requests" description="Approve or reject Loyalty Card UAE Support access requests for your business.">
          {pendingRequests.length ? <div className="grid gap-3">{pendingRequests.map((request) => <SupportRequestCard key={request.id} request={request} actionable />)}</div> : <EmptyState title="No pending support requests." description="Support requests that need your approval will appear here." />}
        </SectionCard>

        <SectionCard title="Support Request History" description="Approved, rejected, and expired support access requests.">
          {requests.filter((request) => request.status !== "PENDING").length ? <div className="grid gap-3">{requests.filter((request) => request.status !== "PENDING").map((request) => <SupportRequestCard key={request.id} request={request} />)}</div> : <EmptyState title="No completed support requests." description="Support request decisions will appear here after approval, rejection, or expiry." />}
        </SectionCard>

        <SectionCard title="Support Sessions" description="Support access records visible to Business Owners.">
          {sessions.length ? <><div className="hidden overflow-x-auto md:block"><table className="min-w-full divide-y divide-[#E2E8F0] text-sm"><thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Support Summary</th><th className="px-4 py-3">Started at</th><th className="px-4 py-3">Ended at</th></tr></thead><tbody className="divide-y divide-[#E2E8F0]">{sessions.map((session) => <tr key={`${session.startedAt.toISOString()}-${session.reason}`} className="align-top"><td className="px-4 py-3 font-semibold text-[#0F172A]">{formatShortDate(session.startedAt)}</td><td className="px-4 py-3"><StatusBadge tone={getSessionTone(session.status)}>{session.status}</StatusBadge></td><td className="px-4 py-3 text-[#334155]">{formatSupportDuration(session.startedAt, session.endedAt ?? session.expiresAt)}</td><td className="max-w-xs px-4 py-3 text-[#334155]"><span className="break-words">{session.reason}</span></td><td className="max-w-sm px-4 py-3 text-[#334155]"><span className="break-words">{session.supportSummary ?? "No summary recorded yet."}</span></td><td className="px-4 py-3 text-[#64748B]">{formatDateTime(session.startedAt)}</td><td className="px-4 py-3 text-[#64748B]">{session.endedAt ? formatDateTime(session.endedAt) : "Not ended"}</td></tr>)}</tbody></table></div><div className="grid gap-3 md:hidden">{sessions.map((session) => <article key={`${session.startedAt.toISOString()}-${session.reason}`} className="rounded-md border border-[#E2E8F0] bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#0F172A]">{formatShortDate(session.startedAt)}</p><p className="mt-1 text-xs text-[#64748B]">{formatDateTime(session.startedAt)}</p></div><StatusBadge tone={getSessionTone(session.status)}>{session.status}</StatusBadge></div><dl className="mt-4 grid gap-3 text-sm"><Info label="Duration" value={formatSupportDuration(session.startedAt, session.endedAt ?? session.expiresAt)} /><Info label="Reason" value={session.reason} /><Info label="Support Summary" value={session.supportSummary ?? "No summary recorded yet."} /><Info label="Ended at" value={session.endedAt ? formatDateTime(session.endedAt) : "Not ended"} /></dl></article>)}</div></> : <EmptyState title="No support access recorded." description="Loyalty Card UAE support sessions for your business will appear here after they are completed." action={<Link href="/dashboard" className="inline-flex min-h-10 items-center rounded-md border border-[#CBD5E1] px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">Back to Dashboard</Link>} />}
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

function SupportRequestCard({ request, actionable = false }: { request: { id: number; reason: string; durationMinutes: number; readOnly: boolean; emergency: boolean; status: string; expiresAt: Date; createdAt: Date; reviewedAt: Date | null; responseNote: string | null; requestedByUser: { name: string | null; email: string } }; actionable?: boolean }) {
  return <article className="rounded-md border border-[#E2E8F0] bg-white p-4 shadow-sm"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={request.status === "PENDING" ? "warning" : request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "danger" : "neutral"}>{request.status}</StatusBadge>{request.emergency ? <StatusBadge tone="danger">Emergency</StatusBadge> : null}<StatusBadge tone="neutral">{request.readOnly ? "Read Only" : "Edit Mode"}</StatusBadge></div><p className="mt-3 break-words text-sm font-semibold text-[#0F172A]">{request.reason}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><Info label="Requester" value={request.requestedByUser.name ?? request.requestedByUser.email} /><Info label="Duration" value={`${request.durationMinutes} min`} /><Info label="Requested" value={formatDateTime(request.createdAt)} /><Info label="Expires" value={formatDateTime(request.expiresAt)} /></dl>{request.responseNote ? <p className="mt-3 rounded-md bg-[#F8FAFC] p-3 text-sm text-[#334155]">Response note: {request.responseNote}</p> : null}</div>{actionable ? <div className="grid gap-3"><form action={approveSupportRequestAction} className="grid gap-2"><CsrfInput scope="platform:support-sessions" /><input type="hidden" name="supportRequestId" value={request.id} /><input type="hidden" name="redirectTo" value="/dashboard/support-history" /><input name="responseNote" placeholder="Optional approval note" className="h-10 rounded-md border border-[#E2E8F0] px-3 text-sm" /><button type="submit" className="min-h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700">Approve</button></form><form action={rejectSupportRequestAction} className="grid gap-2"><CsrfInput scope="platform:support-sessions" /><input type="hidden" name="supportRequestId" value={request.id} /><input type="hidden" name="redirectTo" value="/dashboard/support-history" /><input name="responseNote" placeholder="Optional rejection note" className="h-10 rounded-md border border-[#E2E8F0] px-3 text-sm" /><button type="submit" className="min-h-10 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50">Reject</button></form></div> : null}</div></article>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</dt><dd className="mt-1 break-words text-[#334155]">{value}</dd></div>; }
function formatShortDate(date: Date) { return new Intl.DateTimeFormat("en-AE", { month: "short", day: "numeric", year: "numeric" }).format(date); }
function formatSupportDuration(startedAt: Date, endedAt: Date) { const totalMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)); if (totalMinutes < 60) return `${totalMinutes} min`; const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`; }
function getSessionTone(status: string) { if (status === "ACTIVE") return "warning" as const; if (status === "ENDED") return "success" as const; return "neutral" as const; }
