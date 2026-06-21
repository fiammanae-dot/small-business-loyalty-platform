import Link from "next/link";
import { Gift, TicketCheck, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { requireRole } from "@/lib/session";

export default async function BranchProgramsPage() {
  const user = await requireRole("BRANCH_MANAGER");
  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Programs" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: { businessId: user.businessId, active: true },
    include: {
      memberships: {
        select: {
          id: true,
          earnedStamps: true,
          bonusStamps: true,
          status: true,
          stampTransactions: {
            where: { branchId: user.branchId },
            select: { quantity: true },
          },
          rewardRedemptions: {
            where: { branchId: user.branchId },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Programs" hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Available programs</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Read-only program performance for this branch.</p>
          </div>
          <Link href="/branch/customers" className="inline-flex min-h-11 items-center justify-center rounded-md border business-border px-4 py-2 text-sm font-semibold business-text">
            Find Customer
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => {
            const stampsIssued = program.memberships.reduce(
              (sum, membership) => sum + membership.stampTransactions.reduce((stampSum, stamp) => stampSum + stamp.quantity, 0),
              0,
            );
            const rewardsRedeemed = program.memberships.reduce((sum, membership) => sum + membership.rewardRedemptions.length, 0);
            const rewardReadyCustomers = program.memberships.filter((membership) => {
              const progress = progressValue(membership.earnedStamps, membership.bonusStamps);
              return membership.status === "ACTIVE" && progress >= program.requiredStamps;
            }).length;

            return (
              <Link key={program.id} href={`/branch/programs/${program.uuid}`} className="rounded-md border border-[#E5E7EB] p-4 transition business-hover hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-[#111827]">{program.name}</h3>
                    <p className="mt-2 text-sm text-[#6B7280]">Reward: {program.rewardName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <ProgramStat icon={Users} label="Enrolled" value={program.memberships.length.toString()} />
                  <ProgramStat icon={TicketCheck} label="Stamps" value={stampsIssued.toString()} />
                  <ProgramStat icon={Gift} label="Rewards" value={rewardsRedeemed.toString()} />
                  <ProgramStat icon={Trophy} label="Reward-ready" value={rewardReadyCustomers.toString()} />
                </div>
              </Link>
            );
          })}
        </div>
        {programs.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No active programs yet.</p> : null}
      </section>
    </DashboardShell>
  );
}

function ProgramStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#FAFAFA] p-3">
      <Icon className="h-4 w-4 business-text" aria-hidden="true" />
      <p className="mt-2 text-xs text-[#6B7280]">{label}</p>
      <p className="text-base font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
