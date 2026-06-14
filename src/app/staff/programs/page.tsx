import { DashboardShell } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
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
    <DashboardShell user={user} eyebrow="Staff" title="Programs">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Available programs</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <article key={program.id} className="rounded-md border border-[#E5E7EB] p-4">
              <h3 className="font-semibold text-[#111827]">{program.name}</h3>
              <p className="mt-2 text-sm text-[#6B7280]">Progress starts at {progressValue(0, program.startingBonusStamps)} / {program.requiredStamps}</p>
              <p className="mt-2 text-sm text-[#6B7280]">Reward: {program.rewardName}</p>
            </article>
          ))}
        </div>
        {programs.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No active programs yet.</p> : null}
      </section>
    </DashboardShell>
  );
}
