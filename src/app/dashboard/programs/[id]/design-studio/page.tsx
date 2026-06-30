import { ProgramDesignStudioForm } from "@/components/ProgramDesignStudioForm";
import { DashboardShell } from "@/components/DashboardShell";
import { ButtonLink, EmptyState, PageActions, PageIntro, SectionCard } from "@/components/ui";
import { updateProgramDesignStudioAction } from "@/app/dashboard/programs/actions";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createCsrfToken, csrfFieldName } from "@/lib/csrf";
import { resolveBranding } from "@/lib/customer-cards";
import { getRecommendedStampIconsForBusinessType, resolveCardDesign, type CardDesignStampIcon } from "@/lib/card-design";
import { getAllowedStampIconsForBusinessType } from "@/lib/design-studio";
import { prisma } from "@/lib/prisma";

export default async function ProgramDesignStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId },
    select: {
      uuid: true,
      name: true,
      rewardName: true,
      businessType: true,
      cardDesign: true,
    },
  });

  if (!program) {
    return (
      <DashboardShell user={user} eyebrow="Business Owner" title="Design Studio" hideWelcomeMessage>
        <SectionCard>
          <EmptyState title="Program not found" description="This program may have been removed or it does not belong to your business." />
        </SectionCard>
      </DashboardShell>
    );
  }

  const branding = resolveBranding(business.branding);
  const cardDesign = resolveCardDesign(program.cardDesign);
  const recommendedIcons = getRecommendedStampIconsForBusinessType(program.businessType);
  const stampIconOptions = getAllowedStampIconsForBusinessType(program.businessType).map((icon) => ({
    value: icon as CardDesignStampIcon,
    label: labelize(icon),
    recommended: recommendedIcons.includes(icon),
  }));

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Design Studio" hideWelcomeMessage>
      <div className="grid gap-5">
        {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}
        {qs.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{qs.error}</p> : null}
        <PageIntro
          eyebrow={program.name}
          description="Customize the customer-facing loyalty card design for this program only."
          actions={
            <PageActions>
              <ButtonLink href={"/dashboard/programs/" + program.uuid} variant="outline">Back to Program</ButtonLink>
              <ButtonLink href={"/dashboard/programs/" + program.uuid + "/edit"} variant="outline">Edit Program</ButtonLink>
            </PageActions>
          }
        />

        <ProgramDesignStudioForm
          action={updateProgramDesignStudioAction}
          csrfName={csrfFieldName()}
          csrfToken={createCsrfToken("dashboard:program-design-studio")}
          programUuid={program.uuid}
          businessName={business.name}
          programName={program.name}
          rewardName={program.rewardName}
          branding={branding}
          initialDesign={{
            layoutStyle: cardDesign.layoutStyle,
            stampJourneyStyle: cardDesign.stampJourneyStyle,
            stampIcon: cardDesign.stampIcon,
          }}
          stampIconOptions={stampIconOptions}
        />
      </div>
    </DashboardShell>
  );
}

function labelize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
