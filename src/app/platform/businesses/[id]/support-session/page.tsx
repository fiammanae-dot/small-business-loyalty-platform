import Link from "next/link";
import { notFound } from "next/navigation";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SupportCountdown } from "@/components/SupportCountdown";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { joinSupportSessionAction, startSupportSessionAction } from "@/app/platform/businesses/support-actions";

export default async function StartSupportSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activeSessionId?: string; error?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const { id } = await params;
  const qs = await searchParams;
  const business = await prisma.business.findUnique({
    where: { uuid: id },
    select: {
      id: true,
      uuid: true,
      name: true,
      status: true,
      businessType: true,
      createdAt: true,
    },
  });

  if (!business) notFound();

  const activeSessionId = qs.activeSessionId ? Number(qs.activeSessionId) : NaN;
  const activeSession = Number.isInteger(activeSessionId) && activeSessionId > 0
    ? await prisma.supportSession.findFirst({
        where: {
          id: activeSessionId,
          businessId: business.id,
          status: "ACTIVE",
          endedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { adminUser: { select: { name: true, email: true } } },
      })
    : null;
  const archived = business.status === "ARCHIVED";

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title={activeSession ? "Support session already active" : "Open support session"}>
      <section className="max-w-3xl rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Support Access</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#111827]">{business.name}</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Create a secure, time-limited support context for this business workspace.</p>
          </div>
          <Link href={`/platform/businesses/${business.uuid}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
            Back to business
          </Link>
        </div>

        {qs.error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{qs.error}</p> : null}
        {archived ? <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Support sessions cannot be started for archived businesses.</p> : null}

        {activeSession ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-black uppercase tracking-wide text-red-600">Support Session Already Active</p>
            <h3 className="mt-2 text-2xl font-black text-red-950">{business.name}</h3>
            <div className="mt-4 grid gap-3 text-sm text-red-950 sm:grid-cols-2">
              <Info label="Started By" value={activeSession.adminUser.name ?? activeSession.adminUser.email} />
              <Info label="Started" value={formatDate(activeSession.startedAt)} />
              <Info label="Remaining" value="" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Countdown</p>
                <p className="mt-1 break-words font-semibold text-red-950">
                  <SupportCountdown expiresAt={activeSession.expiresAt.toISOString()} />
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <form action={joinSupportSessionAction}>
                <CsrfInput scope="platform:support-sessions" />
                <input type="hidden" name="supportSessionId" value={activeSession.id} />
                <input type="hidden" name="businessUuid" value={business.uuid} />
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 sm:w-fit">
                  Join Existing Session
                </button>
              </form>
              <Link href={`/platform/businesses/${business.uuid}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-100">
                Cancel
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-sm text-[#374151] sm:grid-cols-3">
              <Info label="Business" value={business.name} />
              <Info label="Status" value={business.status} />
              <Info label="Created" value={formatDate(business.createdAt)} />
            </div>

            <form action={startSupportSessionAction} className="mt-6 grid gap-5">
              <CsrfInput scope="platform:support-sessions" />
              <input type="hidden" name="businessId" value={business.id} />
              <input type="hidden" name="businessUuid" value={business.uuid} />

              <label className="grid gap-2 text-sm font-medium text-[#111827]">
                Reason for access
                <RequiredMark />
                <textarea name="reason" required rows={4} disabled={archived} className="min-h-28 rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-normal outline-none focus:border-[#F97316] disabled:bg-[#F3F4F6]" placeholder="Describe why support access is needed." />
              </label>

              <fieldset className="grid gap-3">
                <legend className="text-sm font-semibold text-[#111827]">Duration<RequiredMark /></legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[15, 30, 60].map((duration) => (
                    <label key={duration} className="flex min-h-11 items-center gap-3 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]">
                      <input type="radio" name="durationMinutes" value={duration} required disabled={archived} defaultChecked={duration === 30} className="h-4 w-4" />
                      {duration} minutes
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-sm font-semibold text-[#111827]">
                <span>
                  <span className="block">Read-only mode</span>
                  <span className="mt-1 block text-xs font-normal text-[#6B7280]">Available for later enforcement. Checked by default.</span>
                </span>
                <input type="checkbox" name="readOnly" defaultChecked disabled={archived} className="h-5 w-5 rounded border-[#E5E7EB]" />
              </label>

              <button type="submit" disabled={archived} className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-[#D1D5DB] sm:w-fit">
                Start Support Session
              </button>
            </form>
          </>
        )}
      </section>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      {value ? <p className="mt-1 break-words font-semibold text-[#111827]">{value}</p> : null}
    </div>
  );
}
