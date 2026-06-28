import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getShortCardToken } from "@/lib/customer-cards";
import { formatUaePhoneDisplay, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { requireRole } from "@/lib/session";

export default async function StaffCustomerSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole("STAFF");
  const params = await searchParams;
  const query = params.q?.trim();
  const normalizedQueryPhone = query ? normalizePhone(query) : null;

  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Staff" title="Find customer" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Business and branch assignment are required.</p>
      </DashboardShell>
    );
  }

  const customers = query
    ? await prisma.businessCustomerMembership.findMany({
        where: {
          businessId: user.businessId,
          createdBranchId: user.branchId,
          OR: [
            { globalCustomer: { firstName: { contains: query, mode: "insensitive" } } },
            { globalCustomer: { lastName: { contains: query, mode: "insensitive" } } },
            { globalCustomer: { phone: { contains: query, mode: "insensitive" } } },
            { globalCustomer: { normalizedPhone: { contains: query, mode: "insensitive" } } },
            ...(normalizedQueryPhone ? [{ globalCustomer: { normalizedPhone: normalizedQueryPhone } }] : []),
            { cardToken: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          globalCustomer: true,
          programMemberships: {
            where: { status: "ACTIVE" },
            include: { loyaltyProgram: true },
            orderBy: { enrolledAt: "desc" },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: 25,
      })
    : [];

  return (
    <DashboardShell user={user} eyebrow="Staff" title="Find customer" hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold business-primary">Customer lookup</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Find customer</h2>
          <p className="mt-2 text-sm text-[#6B7280]">Search customers in your assigned branch by name, phone number, or card number.</p>
        </div>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="staff-customer-search">Search customers</label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <input
              id="staff-customer-search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Name, phone, or card number"
              className="h-11 w-full rounded-md border border-[#E5E7EB] pl-10 pr-3 text-sm outline-none business-ring focus:ring-0"
            />
          </div>
          <button type="submit" className="h-11 rounded-md business-button px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Search results</h2>
          <p className="text-sm text-[#6B7280]">{query ? `${customers.length} result(s)` : "Enter a search term to begin."}</p>
        </div>
        <div className="mt-5 grid gap-3">
          {customers.map((membership) => {
            const customerName = `${membership.globalCustomer.firstName} ${membership.globalCustomer.lastName ?? ""}`.trim();
            return (
              <Link
                key={membership.uuid}
                href={`/staff/customers/${membership.uuid}`}
                className="block rounded-md border border-[#E5E7EB] p-4 transition business-hover hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[#111827]">{customerName}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">{formatUaePhoneDisplay(membership.globalCustomer.normalizedPhone)}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">Card: {getShortCardToken(membership.cardToken)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={membership.status} />
                    <span className="rounded-md bg-[#F3F4F6] px-2 py-1 text-xs font-semibold text-[#374151]">{membership.currentTier} member</span>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {membership.programMemberships.slice(0, 3).map((programMembership) => {
                    const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
                    return (
                      <div key={programMembership.uuid} className="rounded-md bg-[#FAFAFA] px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-[#111827]">{programMembership.loyaltyProgram.name}</span>
                          <span className="text-[#6B7280]">{progress}/{programMembership.loyaltyProgram.requiredStamps}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {programCustomerStatusLabel({
                            status: programMembership.status,
                            earnedStamps: programMembership.earnedStamps,
                            bonusStamps: programMembership.bonusStamps,
                            requiredStamps: programMembership.loyaltyProgram.requiredStamps,
                          })}
                        </p>
                      </div>
                    );
                  })}
                  {membership.programMemberships.length === 0 ? <p className="text-sm text-[#6B7280]">No active loyalty programs.</p> : null}
                </div>
              </Link>
            );
          })}
          {query && customers.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] p-5 text-center text-sm text-[#6B7280]">No customers found in your assigned branch.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}
