import { DashboardShell } from "@/components/DashboardShell";
import { ProgramCreateWizard } from "@/components/ProgramCreateWizard";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createProgramAction } from "@/app/dashboard/programs/actions";
import { resolveBranding } from "@/lib/customer-cards";
import { createCsrfToken, csrfFieldName } from "@/lib/csrf";
import { getIndustryDefaultCardTheme, getRecommendedStampIconsForBusinessType, resolveIndustryCardDesign, type CardDesignStampIcon } from "@/lib/card-design";
import { getAllowedStampIconsForBusinessType } from "@/lib/design-studio";
import { programTemplates } from "@/lib/programs";

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const branding = resolveBranding(business.branding);
  const defaultCardTheme = getIndustryDefaultCardTheme(business.businessType);
  const defaultCardDesign = resolveIndustryCardDesign(business.businessType);
  const template = business.businessType !== "OTHER" ? programTemplates[business.businessType] : null;
  const recommendedIcons = getRecommendedStampIconsForBusinessType(business.businessType);
  const stampIconOptions = getAllowedStampIconsForBusinessType(business.businessType).map((icon) => ({
    value: icon as CardDesignStampIcon,
    label: labelize(icon),
    recommended: recommendedIcons.includes(icon),
  }));

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Create program">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {params.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}
        <ProgramCreateWizard
          action={createProgramAction}
          defaults={{
            businessType: business.businessType,
            active: true,
            cardTheme: defaultCardTheme,
            name: template?.name ?? "",
            productOrServiceName: template?.productOrServiceName ?? "",
            requiredStamps: template?.requiredStamps ?? 1,
            startingBonusStamps: template?.startingBonusStamps ?? 0,
            rewardName: template?.rewardName ?? "",
            rewardDescription: template?.rewardDescription ?? "",
          }}
          submitLabel="Create Program"
          businessName={business.name}
          branding={branding}
          csrfName={csrfFieldName()}
          csrfToken={createCsrfToken("dashboard:programs")}
          initialDesign={{
            layoutStyle: defaultCardDesign.layoutStyle,
            stampJourneyStyle: defaultCardDesign.stampJourneyStyle,
            stampIcon: defaultCardDesign.stampIcon,
            backgroundStyle: toCreateBackgroundStyle(defaultCardDesign.backgroundStyle),
            backgroundPattern: defaultCardDesign.backgroundPattern,
            rewardStyle: defaultCardDesign.rewardStyle,
            typographyPreset: defaultCardDesign.typographyPreset,
            decorationStyle: defaultCardDesign.decorationStyle,
            visibleSections: defaultCardDesign.visibleSections,
          }}
          stampIconOptions={stampIconOptions}
        />
      </section>
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

function toCreateBackgroundStyle(value: string): "SOLID" | "GRADIENT" | "PATTERN" {
  if (value === "GRADIENT") return "GRADIENT";
  if (value === "PATTERN" || value === "INDUSTRY_PATTERN") return "PATTERN";
  return "SOLID";
}
