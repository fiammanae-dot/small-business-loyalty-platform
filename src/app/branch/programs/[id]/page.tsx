import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
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
  });
  if (!program) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Program not found" hideWelcomeMessage>
        <p className="rounded-md border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">Program not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title={program.name} hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold business-text">{businessTypeLabels[program.businessType]}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{program.name}</h2>
            <p className="mt-2 text-sm text-[#6B7280]">{program.description ?? "No description."}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/branch/programs" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">Back</Link>
            <Link href={`/branch/programs/${program.uuid}/customers`} className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">Customers</Link>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info label="Product/Service" value={program.productOrServiceName} />
          <Info label="Starting progress" value={`${progressValue(0, program.startingBonusStamps)} / ${program.requiredStamps}`} />
          <Info label="Reward" value={program.rewardName} />
        </div>
      </section>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
