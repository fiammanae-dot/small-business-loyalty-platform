import Link from "next/link";
import { CardShareActions } from "@/components/CardShareActions";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getCardUrl } from "@/lib/customer-cards";
import { customerSourceLabels } from "@/lib/customers";
import { formatDate } from "@/lib/format";
import { formatUaePhoneDisplay, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function BranchCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; success?: string }>;
}) {
  const user = await requireRole("BRANCH_MANAGER");
  const params = await searchParams;
  const query = params.q?.trim();
  const normalizedQueryPhone = query ? normalizePhone(query) : null;

  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Business customers">
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }

  const customers = await prisma.businessCustomerMembership.findMany({
    where: {
      businessId: user.businessId,
      ...(query
        ? {
            OR: [
              { globalCustomer: { firstName: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { lastName: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { phone: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { normalizedPhone: { contains: query, mode: "insensitive" } } },
              ...(normalizedQueryPhone ? [{ globalCustomer: { normalizedPhone: normalizedQueryPhone } }] : []),
              { globalCustomer: { email: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { globalCustomer: true, createdBranch: true, business: true },
    orderBy: { joinedAt: "desc" },
  });
  const customerRows = await Promise.all(
    customers.map(async (membership) => ({
      ...membership,
      cardUrl: await getCardUrl(membership.cardToken),
      customerName: `${membership.globalCustomer.firstName} ${membership.globalCustomer.lastName ?? ""}`.trim(),
    })),
  );

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Business customers">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <Message error={params.error} success={params.success} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Business customers</h2>
            <p className="text-sm text-[#6B7280]">Search and open customers across this business. Origin branch is preserved for history.</p>
          </div>
          <Link href="/branch/customers/new" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
            Enroll customer
          </Link>
        </div>
        <form className="mt-5 flex gap-3">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search name, phone, email" className="h-10 flex-1 rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
          <button type="submit" className="rounded-md border business-border px-4 text-sm font-semibold business-text">Search</button>
        </form>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Customer name", "Phone", "Email", "Status", "Joined date", "Card issued branch", "Source", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customerRows.map((membership) => (
                <tr key={membership.id}>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold">{membership.globalCustomer.firstName} {membership.globalCustomer.lastName ?? ""}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatUaePhoneDisplay(membership.globalCustomer.normalizedPhone)}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.globalCustomer.email ?? "-"}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4"><StatusBadge status={membership.status} /></td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(membership.joinedAt)}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.createdBranch?.name ?? "-"}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{customerSourceLabels[membership.source]}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4">
                    <div className="flex flex-col gap-3">
                      <Link href={`/branch/customers/${membership.uuid}`} className="font-semibold business-text">View</Link>
                      <CardShareActions
                        cardUrl={membership.cardUrl}
                        businessName={membership.business.name}
                        customerName={membership.customerName}
                        recipientPhone={membership.globalCustomer.normalizedPhone}
                        auditMembershipUuid={membership.uuid}
                        showCopy={false}
                        showWallet={false}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No customers found.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}
