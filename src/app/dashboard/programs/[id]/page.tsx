import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { businessTypeLabels } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { toggleProgramAction } from "@/app/dashboard/programs/actions";

export default async function ProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  let program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId },
    include: {
      memberships: { include: { businessCustomerMembership: { include: { globalCustomer: true } } } },
      rewardRedemptions: true,
    },
  });
  if (!program && /^\d+$/.test(id)) {
    program = await prisma.loyaltyProgram.findFirst({
      where: { id: Number(id), businessId: user.businessId },
      include: {
        memberships: { include: { businessCustomerMembership: { include: { globalCustomer: true } } } },
        rewardRedemptions: true,
      },
    });
  }
  if (!program) return <NotFound user={user} />;
  const nextActive = !program.active;
  const safeRequiredStamps = Math.max(program.requiredStamps, 1);
  const enrolledCustomers = program.memberships.length;
  const activeCustomers = program.memberships.filter(
    (membership) => membership.status === "ACTIVE" && progressValue(membership.earnedStamps, membership.bonusStamps) < safeRequiredStamps,
  ).length;
  const rewardReadyCustomers = program.memberships.filter(
    (membership) => membership.status !== "COMPLETED" && progressValue(membership.earnedStamps, membership.bonusStamps) >= safeRequiredStamps,
  ).length;
  const redeemedRewards = program.rewardRedemptions.length;
  const progressTotal = program.memberships.reduce(
    (sum, membership) => sum + progressValue(membership.earnedStamps, membership.bonusStamps),
    0,
  );
  const averageCompletionRate =
    enrolledCustomers > 0 ? Math.min(100, Math.round((progressTotal / (enrolledCustomers * safeRequiredStamps)) * 100)) : 0;
  const bonusStampsIssued = program.memberships.reduce((sum, membership) => sum + membership.bonusStamps, 0);
  const earnedStamps = program.memberships.reduce((sum, membership) => sum + membership.earnedStamps, 0);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title={program.name}>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {qs.success ? <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold business-text">{businessTypeLabels[program.businessType]}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{program.name}</h2>
            <p className="mt-2 text-sm text-[#6B7280]">{program.description ?? "No description."}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/programs" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">Back</Link>
            <Link href={`/dashboard/programs/${program.uuid}/edit`} className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">Edit Program</Link>
            <form action={toggleProgramAction}>
              <CsrfInput scope="dashboard:programs" />
              <input type="hidden" name="programUuid" value={program.uuid} />
              <input type="hidden" name="active" value={nextActive.toString()} />
              {nextActive ? (
                <button type="submit" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
                  Enable Program
                </button>
              ) : (
                <ConfirmSubmitButton
                  message="Disable this loyalty program? Customers will no longer earn stamps for it."
                  className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]"
                >
                  Disable Program
                </ConfirmSubmitButton>
              )}
            </form>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info label="Product/Service" value={program.productOrServiceName} />
          <Info label="Required stamps" value={program.requiredStamps.toString()} />
          <Info label="Starting bonus" value={program.startingBonusStamps.toString()} />
          <Info label="Referral reward" value={`${program.referralRewardBonusStamps} bonus stamp${program.referralRewardBonusStamps === 1 ? "" : "s"}`} />
          <Info label="Reward" value={program.rewardName} />
          <Info label="Status" value={program.active ? "active" : "inactive"} />
          <Info label="Created" value={formatDate(program.createdAt)} />
          <Info label="Start date" value={program.startDate ? formatDate(program.startDate) : "-"} />
          <Info label="End date" value={program.endDate ? formatDate(program.endDate) : "-"} />
          <Info label="Enrolled customers" value={program.memberships.length.toString()} />
          <Info label="Reward description" value={program.rewardDescription} wide />
        </div>
      </section>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Program Status</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Enrolled Customers" value={enrolledCustomers.toString()} />
          <Metric label="Active Customers" value={activeCustomers.toString()} />
          <Metric label="Reward Ready" value={rewardReadyCustomers.toString()} />
          <Metric label="Redeemed Rewards" value={redeemedRewards.toString()} />
          <CompletionMetric value={averageCompletionRate} />
          <Metric label="Bonus Stamps Issued" value={bonusStampsIssued.toString()} />
          <Metric label="Earned Stamps" value={earnedStamps.toString()} />
          <Metric label="Reward Name" value={program.rewardName} />
          <Metric label="Program Status" value={program.active ? "Active" : "Inactive"} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Enrolled customers</h2>
          <Link href={`/dashboard/programs/${program.uuid}/customers`} className="text-sm font-semibold business-text">Manage customers</Link>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Customer", "Progress", "Bonus", "Earned", "Status", "Enrolled"].map((heading) => (
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
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.bonusStamps}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.earnedStamps}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">
                    {programCustomerStatusLabel({
                      status: membership.status,
                      earnedStamps: membership.earnedStamps,
                      bonusStamps: membership.bonusStamps,
                      requiredStamps: safeRequiredStamps,
                    })}
                  </td>
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

function NotFound({ user }: { user: Parameters<typeof DashboardShell>[0]["user"] }) {
  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Program not found">
      <p className="rounded-md border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">Program not found.</p>
    </DashboardShell>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-[#E5E7EB] p-4 ${wide ? "md:col-span-3" : ""}`}>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function CompletionMetric({ value }: { value: number }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
      <p className="text-sm text-[#6B7280]">Average Completion Rate</p>
      <p className="mt-2 text-lg font-semibold text-[#111827]">{value}%</p>
      <div className="mt-3 h-2 rounded-full business-secondary-bg-soft">
        <div className="h-2 rounded-full business-button" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
