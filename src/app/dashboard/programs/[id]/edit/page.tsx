import { DashboardShell } from "@/components/DashboardShell";
import { ProgramForm } from "@/components/ProgramForm";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { prisma } from "@/lib/prisma";
import { updateProgramAction } from "@/app/dashboard/programs/actions";
import { resolveBranding } from "@/lib/customer-cards";

export default async function EditProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const branding = resolveBranding(business.branding);
  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId },
  });

  if (!program) {
    return (
      <DashboardShell user={user} eyebrow="Business Owner" title="Program not found">
        <p className="rounded-md border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">Program not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Edit program">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {qs.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{qs.error}</p> : null}
        <ProgramForm
          action={updateProgramAction}
          defaults={{
            uuid: program.uuid,
            name: program.name,
            businessType: program.businessType,
            productOrServiceName: program.productOrServiceName,
            description: program.description,
            requiredStamps: program.requiredStamps,
            startingBonusStamps: program.startingBonusStamps,
            referralRewardBonusStamps: program.referralRewardBonusStamps,
            cardTheme: program.cardTheme,
            rewardName: program.rewardName,
            rewardDescription: program.rewardDescription,
            active: program.active,
            startDate: program.startDate,
            endDate: program.endDate,
          }}
          submitLabel="Save Program"
          businessName={business.name}
          branding={branding}
        />
      </section>
    </DashboardShell>
  );
}

