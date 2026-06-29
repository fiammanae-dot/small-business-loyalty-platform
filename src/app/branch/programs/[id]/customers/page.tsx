import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, EmptyState, ProgressBar } from "@/components/ui";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel, startingStampPolicyLabel } from "@/lib/programs";
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
      <DashboardShell user={user} eyebrow="Branch Manager" title="Program customers" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId, active: true },
    include: {
      memberships: {
        where: { businessCustomerMembership: { createdBranchId: user.branchId } },
        include: { businessCustomerMembership: { include: { globalCustomer: true, createdBranch: true } } },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });
  if (!program) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Program not found" hideWelcomeMessage>
        <EmptyState title="Program not found." />
      </DashboardShell>
    );
  }

  const availableCustomers = await prisma.businessCustomerMembership.findMany({
    where: {
      businessId: user.businessId,
      createdBranchId: user.branchId,
      status: "ACTIVE",
      programMemberships: { none: { loyaltyProgramId: program.id } },
    },
    include: { globalCustomer: true, createdBranch: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title={`${program.name} customers`} hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {qs.error || qs.success ? <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${qs.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{qs.error ?? qs.success}</p> : null}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Enroll business customer</h2>
            <p className="text-sm text-[#6B7280]">Starting stamps: {program.startingBonusStamps} - Apply when: {startingStampPolicyLabel(program.startingStampPolicy)}</p>
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
        <div className="mt-6 hidden overflow-x-auto md:block">
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
        </div>
        <div className="mt-6 grid gap-3 md:hidden">
          {program.memberships.map((membership) => {
            const customer = membership.businessCustomerMembership.globalCustomer;
            const progress = progressValue(membership.earnedStamps, membership.bonusStamps);
            const status = programCustomerStatusLabel({
              status: membership.status,
              earnedStamps: membership.earnedStamps,
              bonusStamps: membership.bonusStamps,
              requiredStamps: program.requiredStamps,
            });
            return (
              <Card key={membership.id}>
                <CardContent className="space-y-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-[#111827]">{customer.firstName} {customer.lastName ?? ""}</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">Enrolled {formatDate(membership.enrolledAt)}</p>
                  </div>
                  <ProgressBar value={progress} max={program.requiredStamps} label={`${progress} / ${program.requiredStamps}`} barClassName="business-button" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <MobileInfo label="Status" value={status} />
                    <MobileInfo label="Reward" value={program.rewardName} />
                    <MobileInfo label="Branch" value={membership.businessCustomerMembership.createdBranch?.name ?? "-"} />
                    <MobileInfo label="Progress" value={`${progress} visits`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {program.memberships.length === 0 ? <EmptyState title="No enrolled customers yet." className="my-4" /> : null}
      </section>
    </DashboardShell>
  );
}

function MobileInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
