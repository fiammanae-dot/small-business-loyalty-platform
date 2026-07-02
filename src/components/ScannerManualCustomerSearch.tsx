import Link from "next/link";
import { Link2, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, SectionCard } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { formatUaePhoneDisplay, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { extractScanToken } from "@/lib/scan";

type ScannerManualCustomerSearchProps = {
  businessId: number;
  branchId?: number | null;
  query?: string;
  actionPath: string;
};

function detectedTypeLabel(token: string) {
  if (token.startsWith("referral:")) return "Referral invitation";
  if (token.startsWith("cst_")) return "Customer card";
  if (token.startsWith("scan_")) return "Program scan token";
  return "Secure scan input";
}

function scanFlowHref(token: string) {
  if (token.startsWith("referral:")) {
    return "/scan/referral/" + encodeURIComponent(token.slice("referral:".length));
  }
  return "/scan/" + encodeURIComponent(token);
}

export async function ScannerManualCustomerSearch({ businessId, branchId, query, actionPath }: ScannerManualCustomerSearchProps) {
  const trimmedQuery = query?.trim() ?? "";
  const secureScanToken = trimmedQuery ? extractScanToken(trimmedQuery) : "";
  const normalizedPhone = trimmedQuery && !secureScanToken ? normalizePhone(trimmedQuery) : null;
  const shouldSearch = !secureScanToken && trimmedQuery.length >= 2;

  const results = shouldSearch
    ? await prisma.businessCustomerMembership.findMany({
        where: {
          businessId,
          ...(branchId ? { createdBranchId: branchId } : {}),
          OR: [
            { firstName: { contains: trimmedQuery, mode: "insensitive" } },
            { lastName: { contains: trimmedQuery, mode: "insensitive" } },
            { phone: { contains: trimmedQuery, mode: "insensitive" } },
            { normalizedPhone: { contains: trimmedQuery, mode: "insensitive" } },
            ...(normalizedPhone ? [{ normalizedPhone }] : []),
            { cardToken: { contains: trimmedQuery, mode: "insensitive" } },
            { referralCode: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        include: {
          createdBranch: true,
          programMemberships: {
            where: {
              status: "ACTIVE",
              scanStatus: "ACTIVE",
              loyaltyProgram: { active: true },
            },
            include: { loyaltyProgram: true },
            orderBy: { enrolledAt: "desc" },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: 8,
      })
    : [];

  return (
    <SectionCard title="Search customer" description="Search by name, phone, card link, QR link, scan token, or referral code." className="max-w-full overflow-x-hidden">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E5E7EB]" aria-hidden="true" />
        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">OR</span>
        <span className="h-px flex-1 bg-[#E5E7EB]" aria-hidden="true" />
      </div>

      <form action={actionPath} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          name="customerSearch"
          defaultValue={trimmedQuery}
          placeholder="Name, phone, card link, scan token, or referral code"
          className="min-h-12 min-w-0 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none business-ring focus:ring-0"
        />
        <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-md business-button px-5 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {secureScanToken ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Link2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">{detectedTypeLabel(secureScanToken)} detected.</p>
                <p className="mt-1 text-emerald-800">Security note: this opens the existing server-side validation flow before any stamp, reward, or referral action.</p>
              </div>
            </div>
            <Link href={scanFlowHref(secureScanToken)} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md business-button px-4 text-sm font-semibold text-white">
              Open scan flow
            </Link>
          </div>
        </div>
      ) : null}

      {trimmedQuery && !secureScanToken && !shouldSearch ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Enter at least 2 characters to search.
        </p>
      ) : null}

      {shouldSearch ? (
        <div className="mt-4 grid gap-3">
          {results.map((membership) => {
            const customerName = `${membership.firstName} ${membership.lastName ?? ""}`.trim();
            const activePrograms = membership.programMemberships;
            const scanToken = activePrograms.length === 1 ? activePrograms[0].scanToken : membership.cardToken;
            const canOpenScanFlow = membership.status === "ACTIVE" && membership.cardStatus === "ACTIVE" && activePrograms.length > 0;

            return (
              <article key={membership.id} className="rounded-md border border-[#E5E7EB] p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#111827]">{customerName}</p>
                      <StatusBadge status={membership.status} />
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-[#6B7280] sm:grid-cols-2 lg:grid-cols-4">
                      <p>{formatUaePhoneDisplay(membership.normalizedPhone)}</p>
                      <p>{membership.createdBranch?.name ?? "No branch"}</p>
                      <p>Joined {formatDate(membership.joinedAt)}</p>
                      <p>{activePrograms.length} active program{activePrograms.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  {canOpenScanFlow ? (
                    <Link href={scanFlowHref(scanToken)} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md business-button px-4 text-sm font-semibold text-white">
                      Open scan flow
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#6B7280]">
                      No active scan
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          {results.length === 0 ? (
            <EmptyState title="No matching customers" description="No matching customers found in this business." />
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
