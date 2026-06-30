"use client";

import { useMemo, useState } from "react";
import type { CardDesignLayoutStyle, CardDesignStampIcon, CardDesignStampJourneyStyle } from "@/lib/card-design";
import { getCardThemeForLayoutStyle, getCardStyleForLayoutStyle, resolveCardDesign } from "@/lib/card-design";
import { resolveCardThemeColors } from "@/lib/card-themes";
import { designStudioStampJourneyOptions, designStudioTemplateOptions } from "@/lib/design-studio";
import { LoyaltyWalletCard } from "@/components/public-card/LoyaltyWalletCard";
import { Button, SectionCard } from "@/components/ui";

type PreviewBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  logoUrl: string | null;
};

export function ProgramDesignStudioForm({
  action,
  csrfName,
  csrfToken,
  programUuid,
  businessName,
  programName,
  rewardName,
  branding,
  initialDesign,
  stampIconOptions,
}: {
  action: (formData: FormData) => void | Promise<void>;
  csrfName: string;
  csrfToken: string;
  programUuid: string;
  businessName: string;
  programName: string;
  rewardName: string;
  branding: PreviewBranding;
  initialDesign: {
    layoutStyle: CardDesignLayoutStyle;
    stampJourneyStyle: CardDesignStampJourneyStyle;
    stampIcon: CardDesignStampIcon;
  };
  stampIconOptions: Array<{ value: CardDesignStampIcon; label: string; recommended: boolean }>;
}) {
  const [layoutStyle, setLayoutStyle] = useState(initialDesign.layoutStyle);
  const [stampJourneyStyle, setStampJourneyStyle] = useState(initialDesign.stampJourneyStyle);
  const [stampIcon, setStampIcon] = useState(initialDesign.stampIcon);
  const cardDesign = useMemo(
    () =>
      resolveCardDesign({
        layoutStyle,
        cardStyle: getCardStyleForLayoutStyle(layoutStyle),
        stampJourneyStyle,
        stampIcon,
      }),
    [layoutStyle, stampJourneyStyle, stampIcon],
  );
  const previewTheme = useMemo(
    () =>
      resolveCardThemeColors({
        cardTheme: getCardThemeForLayoutStyle(layoutStyle),
        branding,
        cardDesign,
      }),
    [branding, cardDesign, layoutStyle],
  );
  const selectedIconLabel = stampIconOptions.find((option) => option.value === stampIcon)?.label ?? stampIcon;
  const selectedJourneyLabel = designStudioStampJourneyOptions.find((option) => option.value === stampJourneyStyle)?.label ?? stampJourneyStyle;

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <input type="hidden" name={csrfName} value={csrfToken} />
      <input type="hidden" name="programUuid" value={programUuid} />

      <div className="grid gap-5">
        <SectionCard title="Card Template" description="Choose the wallet card template for this loyalty program only.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioTemplateOptions.map((option) => (
              <label key={option.value} className="flex min-h-28 cursor-pointer gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[var(--business-primary)] has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)]">
                <input
                  type="radio"
                  name="layoutStyle"
                  value={option.value}
                  checked={layoutStyle === option.value}
                  onChange={() => setLayoutStyle(option.value)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#111827]">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Stamp Journey" description="Prepare the progress style this program will use as Design Studio rendering expands.">
          <div className="grid gap-3 md:grid-cols-3">
            {designStudioStampJourneyOptions.map((option) => (
              <label key={option.value} className="flex min-h-28 cursor-pointer gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[var(--business-primary)] has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)]">
                <input
                  type="radio"
                  name="stampJourneyStyle"
                  value={option.value}
                  checked={stampJourneyStyle === option.value}
                  onChange={() => setStampJourneyStyle(option.value)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#111827]">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Stamp Icon" description="Recommended icons for this business type appear first, followed by safe general options.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stampIconOptions.map((option) => (
              <label key={option.value} className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[var(--business-primary)] has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)]">
                <input
                  type="radio"
                  name="stampIcon"
                  value={option.value}
                  checked={stampIcon === option.value}
                  onChange={() => setStampIcon(option.value)}
                  className="h-4 w-4"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#111827]">{option.label}</span>
                  {option.recommended ? <span className="mt-1 block text-xs font-semibold business-text">Recommended</span> : null}
                </span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Save Design" description="Saving applies this design to this loyalty program only. Other programs are unchanged.">
          <Button type="submit" variant="business" className="w-fit">
            Save Design
          </Button>
        </SectionCard>
      </div>

      <aside className="grid h-fit gap-4 xl:sticky xl:top-6">
        <SectionCard title="Live Preview" description="The card template updates immediately. Journey and icon are saved now for future renderer support.">
          <LoyaltyWalletCard
            businessName={businessName}
            businessLogoUrl={branding.logoUrl}
            customerName="Mina Hanna"
            memberSince="Jun 2026"
            tierLabel="Silver Member"
            tierIcon="S"
            qrCode={null}
            rewardReady={false}
            theme={previewTheme}
            programName={programName}
            rewardName={rewardName}
            progress={7}
            required={10}
            remaining={3}
            completion={70}
          />
          <div className="mt-4 grid gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm">
            <PreviewLine label="Template" value={designStudioTemplateOptions.find((option) => option.value === layoutStyle)?.label ?? layoutStyle} />
            <PreviewLine label="Journey" value={selectedJourneyLabel} />
            <PreviewLine label="Stamp icon" value={selectedIconLabel} />
          </div>
        </SectionCard>
      </aside>
    </form>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-right font-semibold text-[#111827]">{value}</span>
    </div>
  );
}
