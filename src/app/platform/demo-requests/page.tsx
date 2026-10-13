import type { DemoRequestStatus } from "@prisma/client";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { Button, EmptyState, MetricCard, SectionCard } from "@/components/ui";
import { demoRequestInbox } from "@/lib/demo-requests";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { updateDemoRequestAction } from "./actions";

const STATUSES: Array<{ value: DemoRequestStatus; label: string; className: string }> = [
  { value: "NEW", label: "New", className: "border-[#F3D9A4] bg-[#FCF0DC] text-[#B25E09]" },
  { value: "CONTACTED", label: "Contacted", className: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]" },
  { value: "WON", label: "Won", className: "border-[#BFE6D6] bg-[#E8F6F0] text-[#0F6E4F]" },
  { value: "LOST", label: "Lost", className: "border-[#E5E7EB] bg-[#F3F4F6] text-[#6B7280]" },
];

type SearchParams = Promise<{ status?: string; error?: string; success?: string }>;

/** Every "Request Demo" submission from the website, newest first, with a status the administrator keeps up to date. */
export default async function DemoRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const filter = STATUSES.find((status) => status.value === params.status)?.value;

  const [requests, counts] = await Promise.all([
    prisma.demoRequest.findMany({ where: filter ? { status: filter } : {}, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.demoRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countFor = (status: DemoRequestStatus) => counts.find((row) => row.status === status)?._count._all ?? 0;
  const total = counts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Demo requests">
      <div className="grid gap-5">
        {params.error || params.success ? (
          <p className={`rounded-md border px-3 py-2 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {params.error ?? params.success}
          </p>
        ) : null}

        <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="All requests" value={total} href="/platform/demo-requests" />
          <MetricCard label="New" value={countFor("NEW")} href="/platform/demo-requests?status=NEW" tone={countFor("NEW") > 0 ? "warning" : "neutral"} />
          <MetricCard label="Contacted" value={countFor("CONTACTED")} href="/platform/demo-requests?status=CONTACTED" tone="info" />
          <MetricCard label="Won" value={countFor("WON")} href="/platform/demo-requests?status=WON" tone="success" />
          <MetricCard label="Lost" value={countFor("LOST")} href="/platform/demo-requests?status=LOST" />
        </section>

        <SectionCard
          title={filter ? `${STATUSES.find((status) => status.value === filter)?.label} requests` : "All requests"}
          description={`Each request is also emailed to ${demoRequestInbox()} the moment it arrives. Reply from there, then mark it here.`}
          actions={
            filter ? (
              <Link href="/platform/demo-requests" className="text-sm font-semibold text-[var(--accent-deep)] hover:underline">
                Show all
              </Link>
            ) : null
          }
        >
          {requests.length === 0 ? (
            <EmptyState icon={<Inbox className="h-5 w-5" />} title="No demo requests yet" description="Requests from the website's Request Demo form will appear here." />
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => {
                const status = STATUSES.find((item) => item.value === request.status) ?? STATUSES[0];
                return (
                  <article key={request.id} className="grid gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4 lg:grid-cols-[1.4fr_1fr_1fr]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#111827]">{request.businessName}</h3>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {request.businessType} · {request.branches} {request.branches === 1 ? "branch" : "branches"} · {request.country}
                      </p>
                      <p className="mt-2 text-xs text-[#9CA3AF]">
                        Received {formatDateTime(request.createdAt)}
                        {request.emailedAt ? "" : " · email not sent"}
                      </p>
                      {request.message ? <p className="mt-3 whitespace-pre-line rounded-lg bg-[#F9FAFB] p-3 text-sm leading-6 text-[#374151]">{request.message}</p> : null}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-[#111827]">{request.contactName}</p>
                      <p className="mt-1">
                        <a href={`mailto:${request.email}`} className="text-[var(--accent-deep)] hover:underline">
                          {request.email}
                        </a>
                      </p>
                      <p className="mt-1">
                        <a href={`tel:${request.phone.replace(/[^\d+]/g, "")}`} className="text-[var(--accent-deep)] hover:underline">
                          {request.phone}
                        </a>
                      </p>
                      <a
                        href={`https://wa.me/${request.phone.replace(/[^\d]/g, "").replace(/^0/, "971")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-[#0F6E4F] hover:underline"
                      >
                        Open in WhatsApp
                      </a>
                    </div>
                    <form action={updateDemoRequestAction} className="grid gap-2">
                      <CsrfInput scope="platform:demo-requests" />
                      <input type="hidden" name="uuid" value={request.uuid} />
                      <label className="grid gap-1 text-xs font-semibold text-[#6B7280]">
                        Status
                        <select name="status" defaultValue={request.status} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827]">
                          {STATUSES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-semibold text-[#6B7280]">
                        Note
                        <textarea name="note" rows={2} defaultValue={request.note ?? ""} placeholder="Called on Monday, demo booked for..." className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]" />
                      </label>
                      <Button type="submit" variant="outline" size="sm">
                        Save
                      </Button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
