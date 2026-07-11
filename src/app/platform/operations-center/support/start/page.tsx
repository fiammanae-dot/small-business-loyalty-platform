import Link from "next/link";
import type { ReactNode } from "react";
import { LifeBuoy, Search } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SupportCountdown } from "@/components/SupportCountdown";
import { EmptyState, RequiredMark, SectionCard } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { expireStaleSupportSessions } from "@/lib/support-sessions";
import { joinSupportSessionAction, startSupportSessionAction } from "@/app/platform/businesses/support-actions";

type StartSupportSearchParams = {
  businessId?: string;
  activeSessionId?: string;
  error?: string;
};

function parsePositiveInt(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function OperationsStartSupportSessionPage({
  searchParams,
}: {
  searchParams: Promise<StartSupportSearchParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  await expireStaleSupportSessions();

  const params = await searchParams;
  const selectedBusinessId = parsePositiveInt(params.businessId);
  const activeSessionId = parsePositiveInt(params.activeSessionId);

  const [businesses, selectedBusiness] = await Promise.all([
    prisma.business.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      select: { id: true, uuid: true, name: true, status: true, businessType: true, supportAccessPolicy: true },
    }),
    selectedBusinessId
      ? prisma.business.findFirst({
          where: { id: selectedBusinessId, status: { not: "ARCHIVED" } },
          select: { id: true, uuid: true, name: true, status: true, businessType: true, supportAccessPolicy: true },
        })
      : null,
  ]);

  const activeSession = selectedBusiness
    ? await prisma.supportSession.findFirst({
        where: {
          ...(activeSessionId ? { id: activeSessionId } : {}),
          businessId: selectedBusiness.id,
          status: "ACTIVE",
          endedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { startedAt: "desc" },
        include: { adminUser: { select: { name: true, email: true } } },
      })
    : null;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Start Support Session">
      <div className="grid gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">Operations Center</p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Open a support session</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Select a business, enter a reason, and start secure time-limited support access.</p>
          </div>
          <Link href="/platform/operations-center" className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
            Cancel
          </Link>
        </div>

        {params.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}

        <SectionCard title="Select Business" description="Search or choose the business workspace that needs support.">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-sm font-semibold text-[#111827]">
              Business
              <div className="mt-1 flex min-w-0 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3">
                <Search className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
                <select name="businessId" defaultValue={selectedBusiness?.id ?? ""} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none">
                  <option value="">Choose a business</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name} - {business.status}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600">
              Continue
            </button>
          </form>
        </SectionCard>

        {!selectedBusiness ? (
          <EmptyState
            icon={<LifeBuoy className="h-5 w-5" />}
            title="Select a business to continue."
            description="The support session form appears after you choose an active business workspace."
          />
        ) : activeSession ? (
          <SectionCard title="Support Session Already Active" description="This business already has an active support session. Join it instead of creating a duplicate.">
            <div className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-950 md:grid-cols-2">
              <Info label="Business" value={selectedBusiness.name} />
              <Info label="Started By" value={activeSession.adminUser.name ?? activeSession.adminUser.email} />
              <Info label="Started" value={formatDateTime(activeSession.startedAt)} />
              <Info label="Remaining" value={<SupportCountdown expiresAt={activeSession.expiresAt.toISOString()} />} />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <form action={joinSupportSessionAction}>
                <CsrfInput scope="platform:support-sessions" />
                <input type="hidden" name="supportSessionId" value={activeSession.id} />
                <input type="hidden" name="businessUuid" value={selectedBusiness.uuid} />
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 sm:w-fit">
                  Join Existing Session
                </button>
              </form>
              <Link href="/platform/operations-center" className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-100">
                Cancel
              </Link>
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Session Details" description="Reason and duration are required. Read-only mode is checked by default.">
            <form action={startSupportSessionAction} className="grid gap-5">
              <CsrfInput scope="platform:support-sessions" />
              <input type="hidden" name="businessId" value={selectedBusiness.id} />
              <input type="hidden" name="businessUuid" value={selectedBusiness.uuid} />
              <input type="hidden" name="formPath" value={`/platform/operations-center/support/start?businessId=${selectedBusiness.id}`} />
              <input type="hidden" name="activeRedirectTo" value="/platform/operations-center/support/start" />

              <div className="grid gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:grid-cols-3">
                <Info label="Business" value={selectedBusiness.name} />
                <Info label="Status" value={selectedBusiness.status} />
                <Info label="Type" value={selectedBusiness.businessType.replaceAll("_", " ")} />
                <Info label="Support Policy" value={formatSupportAccessPolicy(selectedBusiness.supportAccessPolicy)} />
              </div>

              <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                Reason for access
                <RequiredMark />
                <textarea name="reason" required rows={4} className="min-h-28 rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-normal outline-none focus:border-[#F97316]" placeholder="Describe why support access is needed." />
              </label>

              <fieldset className="grid gap-3">
                <legend className="text-sm font-semibold text-[#111827]">Duration<RequiredMark /></legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[15, 30, 60].map((duration) => (
                    <label key={duration} className="flex min-h-11 items-center gap-3 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]">
                      <input type="radio" name="durationMinutes" value={duration} required defaultChecked={duration === 30} className="h-4 w-4" />
                      {duration} minutes
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-sm font-semibold text-[#111827]">
                  <span>
                    <span className="block">Read-only mode</span>
                    <span className="mt-1 block text-xs font-normal text-[#6B7280]">Checked by default for support visibility.</span>
                  </span>
                  <input type="checkbox" name="readOnly" defaultChecked className="h-5 w-5 rounded border-[#E5E7EB]" />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
                  <span>
                    <span className="block">Emergency access</span>
                    <span className="mt-1 block text-xs font-normal text-red-700">Starts immediately only when the business policy allows emergency access.</span>
                  </span>
                  <input type="checkbox" name="emergency" className="h-5 w-5 rounded border-red-300" />
                </label>
              </div>

              <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-fit">
                {selectedBusiness.supportAccessPolicy === "IMMEDIATE" ? "Start Support Session" : "Submit Support Request"}
              </button>
            </form>
          </SectionCard>
        )}
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-1 break-words font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}

function formatSupportAccessPolicy(policy: string) {
  if (policy === "IMMEDIATE") return "Immediate Support";
  if (policy === "APPROVAL_REQUIRED") return "Approval Required";
  if (policy === "EMERGENCY_ACCESS") return "Emergency Access Allowed";
  return policy.replaceAll("_", " ");
}
