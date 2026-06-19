import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { requireRole } from "@/lib/session";
import { enrollBranchCustomerInProgramAction } from "@/app/branch/programs/actions";

export default async function BranchProgramCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireRole("BRANCH_MANAGER");
  const { id } = await params;
  const qs = await searchParams;
  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Program customers">
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId, active: true },
    include: {
      memberships: {
        include: { businessCustomerMembership: { include: { globalCustomer: true, createdBranch: true } } },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });
  if (!program) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Program not found">
        <p className="rounded-md border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">Program not found.</p>
      </DashboardShell>
    );
  }

  const availableCustomers = await prisma.businessCustomerMembership.findMany({
    where: {
      businessId: user.businessId,
      status: "ACTIVE",
      programMemberships: { none: { loyaltyProgramId: program.id } },
    },
    include: { globalCustomer: true, createdBranch: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title={`${program.name} customers`}>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {qs.error || qs.success ? <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${qs.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{qs.error ?? qs.success}</p> : null}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Enroll business customer</h2>
            <p className="text-sm text-[#6B7280]">Bonus stamps assigned on enrollment: {program.startingBonusStamps}</p>
          </div>
          <Link href={`/branch/programs/${program.uuid}`} className="text-sm font-semibold business-text">Back to program</Link>
        </div>
        <form action={enrollBranchCustomerInProgramAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <CsrfInput scope="branch:program-enrollment" />
          <input type="hidden" name="programUuid" value={program.uuid} />
          <SearchableCombobox
            label="Customer"
            name="membershipUuid"
            placeholder="Search customers"
            emptyLabel="No eligible customers found."
            required
            options={availableCustomers.map((customer) => ({
              value: customer.uuid,
              label: `${customer.globalCustomer.firstName} ${customer.globalCustomer.lastName ?? ""}`.trim(),
              description: `${customer.globalCustomer.phone}${customer.globalCustomer.email ? ` · ${customer.globalCustomer.email}` : ""}`,
              badge: customer.createdBranch?.name ?? "Business customer",
            }))}
          />
          <button type="submit" className="h-10 rounded-md business-button px-4 text-sm font-semibold text-white">
            Enroll Customer
          </button>
        </form>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Enrolled business customers</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Customer", "Progress", "Status", "Reward", "Enrolled"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {program.memberships.map((membership) => (
                <tr key={membership.id}>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">
                    {membership.businessCustomerMembership.globalCustomer.firstName} {membership.businessCustomerMembership.globalCustomer.lastName ?? ""}
                  </td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{progressValue(membership.earnedStamps, membership.bonusStamps)} / {program.requiredStamps}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">
                    {programCustomerStatusLabel({
                      status: membership.status,
                      earnedStamps: membership.earnedStamps,
                      bonusStamps: membership.bonusStamps,
                      requiredStamps: program.requiredStamps,
                    })}
                  </td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{program.rewardName}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(membership.enrolledAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {program.memberships.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No enrolled customers yet.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}
