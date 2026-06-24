import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { formatUaePhoneDisplay, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

type ScannerManualCustomerSearchProps = {
  businessId: number;
  query?: string;
  actionPath: string;
};

export async function ScannerManualCustomerSearch({ businessId, query, actionPath }: ScannerManualCustomerSearchProps) {
  const trimmedQuery = query?.trim() ?? "";
  const normalizedPhone = trimmedQuery ? normalizePhone(trimmedQuery) : null;
  const shouldSearch = trimmedQuery.length >= 2;

  const results = shouldSearch
    ? await prisma.businessCustomerMembership.findMany({
        where: {
          businessId,
          OR: [
            { globalCustomer: { firstName: { contains: trimmedQuery, mode: "insensitive" } } },
            { globalCustomer: { lastName: { contains: trimmedQuery, mode: "insensitive" } } },
            { globalCustomer: { phone: { contains: trimmedQuery, mode: "insensitive" } } },
            { globalCustomer: { normalizedPhone: { contains: trimmedQuery, mode: "insensitive" } } },
            ...(normalizedPhone ? [{ globalCustomer: { normalizedPhone } }] : []),
            { cardToken: { contains: trimmedQuery, mode: "insensitive" } },
            { referralCode: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        include: {
          globalCustomer: true,
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
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md business-bg-soft business-text">
          <Search className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold business-primary">Find customer manually</p>
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
            Search by customer name, phone number, card number, or referral code when camera scanning is unavailable.
          </p>
        </div>
      </div>

      <form action={actionPath} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          name="customerSearch"
          defaultValue={trimmedQuery}
          placeholder="Name, phone, card number, or referral code"
          className="min-h-12 min-w-0 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none business-ring focus:ring-0"
        />
        <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-md business-button px-5 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {trimmedQuery && !shouldSearch ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Enter at least 2 characters to search.
        </p>
      ) : null}

      {shouldSearch ? (
        <div className="mt-4 grid gap-3">
          {results.map((membership) => {
            const customerName = `${membership.globalCustomer.firstName} ${membership.globalCustomer.lastName ?? ""}`.trim();
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
                    <div className="mt-2 grid gap-1 text-sm text-[#6B7280] sm:grid-cols-2 lg:grid-cols-5">
                      <p>{formatUaePhoneDisplay(membership.globalCustomer.normalizedPhone)}</p>
                      <p>{membership.createdBranch?.name ?? "No branch"}</p>
                      <p>Joined {formatDate(membership.joinedAt)}</p>
                      <p>{activePrograms.length} active program{activePrograms.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  {canOpenScanFlow ? (
                    <Link href={`/scan/${encodeURIComponent(scanToken)}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md business-button px-4 text-sm font-semibold text-white">
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
            <p className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-4 text-sm text-[#6B7280]">
              No matching customers found in this business.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
