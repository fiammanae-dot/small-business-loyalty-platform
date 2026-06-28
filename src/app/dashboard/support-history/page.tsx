import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/ui";
import { requireBusinessOwner } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function BusinessSupportHistoryPage() {
  const user = await requireBusinessOwner();
  const [business, sessions] = await Promise.all([
    prisma.business.findUnique({
      where: { id: user.businessId },
      select: { name: true },
    }),
    prisma.supportSession.findMany({
      where: { businessId: user.businessId },
      orderBy: { startedAt: "desc" },
      select: {
        startedAt: true,
        expiresAt: true,
        endedAt: true,
        status: true,
        reason: true,
        supportSummary: true,
      },
    }),
  ]);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Support History" hideWelcomeMessage>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Support transparency"
          title="Support History"
          description={`Review LoyaltyBase support access for ${business?.name ?? "your business"}. Internal audit activity and administrator technical details stay private to Platform Operations.`}
        />

        <SectionCard title="Support Sessions" description="Support access records visible to Business Owners.">
          {sessions.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                  <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Support Summary</th>
                      <th className="px-4 py-3">Started at</th>
                      <th className="px-4 py-3">Ended at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {sessions.map((session) => (
                      <tr key={`${session.startedAt.toISOString()}-${session.reason}`} className="align-top">
                        <td className="px-4 py-3 font-semibold text-[#0F172A]">{formatShortDate(session.startedAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={getSessionTone(session.status)}>{session.status}</StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-[#334155]">{formatSupportDuration(session.startedAt, session.endedAt ?? session.expiresAt)}</td>
                        <td className="max-w-xs px-4 py-3 text-[#334155]">
                          <span className="break-words">{session.reason}</span>
                        </td>
                        <td className="max-w-sm px-4 py-3 text-[#334155]">
                          <span className="break-words">{session.supportSummary ?? "No summary recorded yet."}</span>
                        </td>
                        <td className="px-4 py-3 text-[#64748B]">{formatDateTime(session.startedAt)}</td>
                        <td className="px-4 py-3 text-[#64748B]">{session.endedAt ? formatDateTime(session.endedAt) : "Not ended"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {sessions.map((session) => (
                  <article key={`${session.startedAt.toISOString()}-${session.reason}`} className="rounded-md border border-[#E2E8F0] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">{formatShortDate(session.startedAt)}</p>
                        <p className="mt-1 text-xs text-[#64748B]">{formatDateTime(session.startedAt)}</p>
                      </div>
                      <StatusBadge tone={getSessionTone(session.status)}>{session.status}</StatusBadge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <Info label="Duration" value={formatSupportDuration(session.startedAt, session.endedAt ?? session.expiresAt)} />
                      <Info label="Reason" value={session.reason} />
                      <Info label="Support Summary" value={session.supportSummary ?? "No summary recorded yet."} />
                      <Info label="Ended at" value={session.endedAt ? formatDateTime(session.endedAt) : "Not ended"} />
                    </dl>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No support access recorded."
              description="LoyaltyBase support sessions for your business will appear here after they are completed."
              action={<Link href="/dashboard" className="inline-flex min-h-10 items-center rounded-md border border-[#CBD5E1] px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">Back to Dashboard</Link>}
            />
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</dt>
      <dd className="mt-1 break-words text-[#334155]">{value}</dd>
    </div>
  );
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatSupportDuration(startedAt: Date, endedAt: Date) {
  const totalMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function getSessionTone(status: string) {
  if (status === "ACTIVE") {
    return "warning" as const;
  }
  if (status === "ENDED") {
    return "success" as const;
  }
  return "neutral" as const;
}
