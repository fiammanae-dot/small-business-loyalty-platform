import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { requireRole } from "@/lib/session";

export default async function BranchProgramsPage() {
  const user = await requireRole("BRANCH_MANAGER");
  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Programs">
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: { businessId: user.businessId, active: true },
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Programs">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Available programs</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <Link key={program.id} href={`/branch/programs/${program.uuid}`} className="rounded-md border border-[#E5E7EB] p-4 transition hover:border-[#F97316]">
              <h3 className="font-semibold text-[#111827]">{program.name}</h3>
              <p className="mt-2 text-sm text-[#6B7280]">{progressValue(0, program.startingBonusStamps)} / {program.requiredStamps} starting progress</p>
              <p className="mt-2 text-sm text-[#6B7280]">Reward: {program.rewardName}</p>
              <p className="mt-2 text-sm text-[#F97316]">{program._count.memberships} enrolled</p>
            </Link>
          ))}
        </div>
        {programs.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No active programs yet.</p> : null}
      </section>
    </DashboardShell>
  );
}
