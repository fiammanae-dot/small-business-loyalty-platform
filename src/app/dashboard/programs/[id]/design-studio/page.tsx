import { ProgramDesignStudioForm } from "@/components/ProgramDesignStudioForm";
import { DashboardShell } from "@/components/DashboardShell";
import { ButtonLink, EmptyState, PageActions, PageIntro, SectionCard } from "@/components/ui";
import {
  deleteBusinessDesignPresetAction,
  renameBusinessDesignPresetAction,
  saveBusinessDesignPresetAction,
  updateProgramDesignStudioAction,
} from "@/app/dashboard/programs/actions";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createCsrfToken, csrfFieldName } from "@/lib/csrf";
import { resolveBranding } from "@/lib/customer-cards";
import { asCardDesignInput, getRecommendedStampIconsForBusinessType, resolveCardDesign, type CardDesignStampIcon } from "@/lib/card-design";
import { getAllowedStampIconsForBusinessType } from "@/lib/design-studio";
import { prisma } from "@/lib/prisma";

export default async function ProgramDesignStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const { id } = await params;
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
  const cardDesign = resolveCardDesign(asCardDesignInput(program.cardDesign));
  const businessPresets = await prisma.businessDesignPreset.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: "desc" },
    select: {
      uuid: true,
      name: true,
      cardDesign: true,
      createdAt: true,
    },
  });
  const sourcePrograms = await prisma.loyaltyProgram.findMany({
    where: { businessId: user.businessId, uuid: { not: program.uuid } },
    orderBy: { createdAt: "desc" },
    select: {
      uuid: true,
      name: true,
      cardDesign: true,
    },
  });
  const recommendedIcons = getRecommendedStampIconsForBusinessType(program.businessType);
  const stampIconOptions = getAllowedStampIconsForBusinessType(program.businessType).map((icon) => ({
    value: icon as CardDesignStampIcon,
    label: labelize(icon),
    recommended: recommendedIcons.includes(icon),
  }));

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Design Your Loyalty Card" hideWelcomeMessage>
      <div className="mx-auto grid w-full max-w-screen-2xl gap-6">
        <PageIntro
          eyebrow={program.name}
          description="Customize the appearance of your customer's digital loyalty card."
          className="rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-white to-[#F8FAFC] p-5 shadow-sm md:p-6"
          actions={
            <PageActions>
              <ButtonLink href={"/dashboard/programs/" + program.uuid} variant="outline">Back to Program</ButtonLink>
              <ButtonLink href={"/dashboard/programs/" + program.uuid + "/edit"} variant="outline">Edit Program</ButtonLink>
            </PageActions>
          }
        />

        <ProgramDesignStudioForm
          action={updateProgramDesignStudioAction}
          savePresetAction={saveBusinessDesignPresetAction}
          renamePresetAction={renameBusinessDesignPresetAction}
          deletePresetAction={deleteBusinessDesignPresetAction}
          csrfName={csrfFieldName()}
          csrfToken={createCsrfToken("dashboard:program-design-studio")}
          programUuid={program.uuid}
          businessName={business.name}
          programName={program.name}
          rewardName={program.rewardName}
          businessType={program.businessType}
          branding={branding}
          initialDesign={{
            layoutStyle: cardDesign.layoutStyle,
            stampJourneyStyle: cardDesign.stampJourneyStyle,
            stampIcon: cardDesign.stampIcon,
            backgroundStyle: cardDesign.backgroundStyle,
            backgroundPattern: cardDesign.backgroundPattern,
            rewardStyle: cardDesign.rewardStyle,
            typographyPreset: cardDesign.typographyPreset,
            decorationStyle: cardDesign.decorationStyle,
            visibleSections: cardDesign.visibleSections,
          }}
          businessPresets={businessPresets.map((preset) => {
            const presetDesign = resolveCardDesign(asCardDesignInput(preset.cardDesign));
            return {
              uuid: preset.uuid,
              name: preset.name,
              createdAt: preset.createdAt.toISOString(),
              cardDesign: {
                layoutStyle: presetDesign.layoutStyle,
                stampJourneyStyle: presetDesign.stampJourneyStyle,
                stampIcon: presetDesign.stampIcon,
                backgroundStyle: toDesignStudioBackgroundStyle(presetDesign.backgroundStyle),
                backgroundPattern: presetDesign.backgroundPattern,
                rewardStyle: presetDesign.rewardStyle,
                typographyPreset: presetDesign.typographyPreset,
                decorationStyle: presetDesign.decorationStyle,
                visibleSections: presetDesign.visibleSections,
              },
            };
          })}
          sourcePrograms={sourcePrograms.map((sourceProgram) => {
            const sourceDesign = resolveCardDesign(asCardDesignInput(sourceProgram.cardDesign));
            return {
              uuid: sourceProgram.uuid,
              name: sourceProgram.name,
              cardDesign: {
                layoutStyle: toDesignStudioLayoutStyle(sourceDesign.layoutStyle),
                stampJourneyStyle: toDesignStudioStampJourneyStyle(sourceDesign.stampJourneyStyle),
                stampIcon: sourceDesign.stampIcon,
                backgroundStyle: toDesignStudioBackgroundStyle(sourceDesign.backgroundStyle),
                backgroundPattern: sourceDesign.backgroundPattern,
                rewardStyle: sourceDesign.rewardStyle,
                typographyPreset: sourceDesign.typographyPreset,
                decorationStyle: sourceDesign.decorationStyle,
                visibleSections: sourceDesign.visibleSections,
              },
            };
          })}
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

function toDesignStudioBackgroundStyle(value: string): "SOLID" | "GRADIENT" | "PATTERN" {
  if (value === "GRADIENT") return "GRADIENT";
  if (value === "PATTERN" || value === "INDUSTRY_PATTERN") return "PATTERN";
  return "SOLID";
}

function toDesignStudioLayoutStyle(value: string): "CLASSIC" | "MODERN" | "PREMIUM" | "LUXURY" {
  if (value === "MODERN") return "MODERN";
  if (value === "PREMIUM") return "PREMIUM";
  if (value === "LUXURY") return "LUXURY";
  return "CLASSIC";
}

function toDesignStudioStampJourneyStyle(value: string): "CIRCLES" | "CONNECTED_DOTS" | "PROGRESS_BAR" {
  if (value === "CONNECTED_DOTS") return "CONNECTED_DOTS";
  if (value === "PROGRESS_BAR") return "PROGRESS_BAR";
  return "CIRCLES";
}
