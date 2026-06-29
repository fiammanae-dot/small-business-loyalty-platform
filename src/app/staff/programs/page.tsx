import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { prisma } from "@/lib/prisma";
import { startingStampPolicyLabel } from "@/lib/programs";
import { requireRole } from "@/lib/session";

export default async function StaffProgramsPage() {
  const user = await requireRole("STAFF");
  const programs = user.businessId
    ? await prisma.loyaltyProgram.findMany({
        where: { businessId: user.businessId, active: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <DashboardShell user={user} eyebrow="Staff" title="Programs" hideWelcomeMessage>
      <SectionCard title="Available programs">
        <h2 className="text-lg font-semibold text-[#111827]">Available programs</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <article key={program.id} className="rounded-md border border-[#E5E7EB] p-4">
              <h3 className="font-semibold text-[#111827]">{program.name}</h3>
              <p className="mt-2 text-sm text-[#6B7280]">Starting stamps: {program.startingBonusStamps}</p>
              <p className="mt-2 text-sm text-[#6B7280]">Reward: {program.rewardName}</p>
              <p className="mt-2 text-sm text-[#6B7280]">Apply when: {startingStampPolicyLabel(program.startingStampPolicy)}</p>
            </article>
          ))}
        </div>
        {programs.length === 0 ? <EmptyState title="No active programs yet." className="my-4" /> : null}
      </SectionCard>
    </DashboardShell>
  );
}





