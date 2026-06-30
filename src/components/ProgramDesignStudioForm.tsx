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
  const selectedStyleLabel = designStudioTemplateOptions.find((option) => option.value === layoutStyle)?.label ?? layoutStyle;

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)] xl:items-start">
      <input type="hidden" name={csrfName} value={csrfToken} />
      <input type="hidden" name="programUuid" value={programUuid} />

      <aside className="order-first grid h-fit gap-4 xl:sticky xl:top-6 xl:order-last">
        <SectionCard
          title="Live Preview"
          description="See how this program's loyalty card feels before saving."
          className="border-[var(--business-primary-soft,#E2E8F0)] bg-gradient-to-b from-white to-[#F8FAFC]"
        >
          <div className="mx-auto max-w-[430px]">
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
          </div>
          <div className="mt-5 grid gap-2 rounded-2xl border border-[#E5E7EB] bg-white/85 p-4 text-sm shadow-sm">
            <PreviewLine label="Card Style" value={selectedStyleLabel} />
            <PreviewLine label="Reward Progress" value={selectedJourneyLabel} />
            <PreviewLine label="Stamp Design" value={selectedIconLabel} />
          </div>
        </SectionCard>
      </aside>

      <div className="order-last grid gap-5 xl:order-first">
        <SectionCard title="Card Style" description="Choose the overall look customers see when they open this program's loyalty card.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioTemplateOptions.map((option) => (
              <label key={option.value} className="group flex min-h-28 cursor-pointer gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)] has-[:checked]:shadow-md">
                <input
                  type="radio"
                  name="layoutStyle"
                  value={option.value}
                  checked={layoutStyle === option.value}
                  onChange={() => setLayoutStyle(option.value)}
                  className="mt-1 h-4 w-4 accent-[var(--business-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#111827] group-has-[:checked]:business-text">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Reward Progress" description="Choose the progress pattern that best matches how customers earn their next reward.">
          <div className="grid gap-3 md:grid-cols-3">
            {designStudioStampJourneyOptions.map((option) => (
              <label key={option.value} className="group flex min-h-28 cursor-pointer gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)] has-[:checked]:shadow-md">
                <input
                  type="radio"
                  name="stampJourneyStyle"
                  value={option.value}
                  checked={stampJourneyStyle === option.value}
                  onChange={() => setStampJourneyStyle(option.value)}
                  className="mt-1 h-4 w-4 accent-[var(--business-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#111827] group-has-[:checked]:business-text">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Stamp Design" description="Pick the stamp mark that will represent each customer visit. Recommended options appear first.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stampIconOptions.map((option) => (
              <label key={option.value} className="group flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)] has-[:checked]:shadow-md">
                <input
                  type="radio"
                  name="stampIcon"
                  value={option.value}
                  checked={stampIcon === option.value}
                  onChange={() => setStampIcon(option.value)}
                  className="h-4 w-4 accent-[var(--business-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#111827] group-has-[:checked]:business-text">{option.label}</span>
                  {option.recommended ? <span className="mt-1 block text-xs font-semibold business-text">Recommended</span> : null}
                </span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Save Design" description="Apply this design to this loyalty program only. Other programs are unchanged." className="sticky bottom-3 z-20 shadow-lg xl:static xl:shadow-sm">
          <Button type="submit" variant="business" size="lg" className="w-full sm:w-fit">
            Save Design
          </Button>
        </SectionCard>
      </div>
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
