import Link from "next/link";
import { Gift, TicketCheck, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { DashboardShell } from "@/components/DashboardShell";
import { getProgramJoinQrDataUrl, getProgramJoinUrl } from "@/lib/program-join";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { businessTypeLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";

export default async function BranchProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("BRANCH_MANAGER");
  const { id } = await params;
  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Program" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId, active: true },
    include: {
      memberships: {
        where: { businessCustomerMembership: { createdBranchId: user.branchId } },
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
  });
  if (!program) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Program not found" hideWelcomeMessage>
        <p className="rounded-md border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">Program not found.</p>
      </DashboardShell>
    );
  }

  const stampsIssued = program.memberships.reduce(
    (sum, membership) => sum + membership.stampTransactions.reduce((stampSum, stamp) => stampSum + stamp.quantity, 0),
    0,
  );
  const rewardsRedeemed = program.memberships.reduce((sum, membership) => sum + membership.rewardRedemptions.length, 0);
  const rewardReadyCustomers = program.memberships.filter((membership) => {
    const progress = progressValue(membership.earnedStamps, membership.bonusStamps);
    return membership.status === "ACTIVE" && progress >= program.requiredStamps;
  }).length;
  const joinUrl = await getProgramJoinUrl(program.joinToken);
  const joinQrCode = await getProgramJoinQrDataUrl(program.joinToken);

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title={program.name} hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold business-text">{businessTypeLabels[program.businessType]}</p>
            <p className="mt-2 text-sm text-[#6B7280]">{program.description ?? "No description."}</p>
          </div>
          <div className="grid gap-3 sm:flex">
            <Link href="/branch/programs" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">Back</Link>
            <Link href={`/branch/programs/${program.uuid}/customers`} className="inline-flex min-h-11 items-center justify-center rounded-md business-button px-4 py-2 text-sm font-semibold text-white">Customers</Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info label="Product/Service" value={program.productOrServiceName} />
          <Info label="Starting progress" value={`${progressValue(0, program.startingBonusStamps)} / ${program.requiredStamps}`} />
          <Info label="Reward" value={program.rewardName} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PerformanceStat icon={Users} label="Enrolled customers" value={program.memberships.length.toString()} />
          <PerformanceStat icon={TicketCheck} label="Branch stamps issued" value={stampsIssued.toString()} />
          <PerformanceStat icon={Gift} label="Branch rewards redeemed" value={rewardsRedeemed.toString()} />
          <PerformanceStat icon={Trophy} label="Reward-ready customers" value={rewardReadyCustomers.toString()} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold business-text">Printable materials</p>
            <h2 className="mt-2 text-lg font-semibold text-[#111827]">Program Join QR</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              Share or print this QR so customers can join the program. This is read-only for Branch Managers and does not change program settings.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <CopyButton value={joinUrl} label="Copy join link" copiedLabel="Join link copied." />
            <Link href={joinUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">
              Open join page
            </Link>
            <Link href={`/branch/programs/${program.uuid}/join-poster`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-md business-button px-4 text-sm font-semibold text-white">
              Print poster
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <img src={joinQrCode} alt={`${program.name} join QR code`} className="h-44 w-44 rounded-xl bg-white" />
          </div>
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Join link</p>
            <p className="mt-2 break-all text-sm font-semibold text-[#111827]">{joinUrl}</p>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function PerformanceStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <Icon className="h-4 w-4 business-text" aria-hidden="true" />
      <p className="mt-3 text-sm text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
