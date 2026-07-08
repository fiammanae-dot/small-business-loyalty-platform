"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import type { BusinessType, CardTheme, StartingStampPolicy } from "@prisma/client";
import type {
  CardDesignBackgroundPattern,
  CardDesignDecorationStyle,
  CardDesignLayoutStyle,
  CardDesignRewardStyle,
  CardDesignStampIcon,
  CardDesignStampJourneyStyle,
  CardDesignTypographyPreset,
  CardSectionVisibility,
} from "@/lib/card-design";
import { getCardStyleForLayoutStyle, resolveCardDesign } from "@/lib/card-design";
import {
  designStudioBackgroundGalleryOptions,
  designStudioCardContentOptions,
  designStudioCardLayoutOptions,
  designStudioProfessionalPresetGroups,
  designStudioRewardStyleOptions,
  designStudioStampJourneyOptions,
  designStudioTemplateOptions,
  designStudioTypographyOptions,
  resolveDesignStudioBackgroundGalleryOption,
  resolveDesignStudioCardLayoutOption,
  resolveDesignStudioTypographyOption,
  type DesignStudioProfessionalPreset,
} from "@/lib/design-studio";
import { resolveCardThemeColors } from "@/lib/card-themes";
import { Button, SectionCard } from "@/components/ui";
import { BackgroundGalleryThumbnail } from "@/components/design-studio/BackgroundGalleryThumbnail";
import { CardLayoutThumbnail } from "@/components/design-studio/CardLayoutThumbnail";
import { StampIconGraphic, StampSlot } from "@/components/design-studio/StampIconGraphic";
import { WalletCardShell, type WalletTheme } from "@/components/public-card/WalletCardShell";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type ProgramPreviewBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  logoUrl: string | null;
};

type ProgramDefaults = {
  name?: string;
  businessType: BusinessType;
  productOrServiceName?: string;
  description?: string | null;
  requiredStamps?: number;
  startingBonusStamps?: number;
  startingStampPolicy?: StartingStampPolicy;
  referralRewardBonusStamps?: number;
  cardTheme?: CardTheme;
  rewardName?: string;
  rewardDescription?: string;
  active?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
};

type BackgroundStyle = "SOLID" | "GRADIENT" | "PATTERN";

export function ProgramCreateWizard({
  action,
  defaults,
  submitLabel,
  businessName,
  branding,
  csrfName,
  csrfToken,
  initialDesign,
  stampIconOptions,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults: ProgramDefaults;
  submitLabel: string;
  businessName: string;
  branding: ProgramPreviewBranding;
  csrfName: string;
  csrfToken: string;
  initialDesign: {
    layoutStyle: CardDesignLayoutStyle;
    stampJourneyStyle: CardDesignStampJourneyStyle;
    stampIcon: CardDesignStampIcon;
    backgroundStyle: BackgroundStyle;
    backgroundPattern: CardDesignBackgroundPattern;
    rewardStyle: CardDesignRewardStyle;
    typographyPreset: CardDesignTypographyPreset;
    decorationStyle: CardDesignDecorationStyle;
    visibleSections: CardSectionVisibility;
  };
  stampIconOptions: Array<{ value: CardDesignStampIcon; label: string; recommended: boolean }>;
}) {
  const wizardRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [layoutStyle, setLayoutStyle] = useState(initialDesign.layoutStyle);
  const [stampJourneyStyle, setStampJourneyStyle] = useState(initialDesign.stampJourneyStyle);
  const [stampIcon, setStampIcon] = useState(initialDesign.stampIcon);
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>(initialDesign.backgroundStyle);
  const [backgroundPattern, setBackgroundPattern] = useState(initialDesign.backgroundPattern);
  const [rewardStyle, setRewardStyle] = useState(initialDesign.rewardStyle);
  const [typographyPreset, setTypographyPreset] = useState(initialDesign.typographyPreset);
  const [decorationStyle, setDecorationStyle] = useState(initialDesign.decorationStyle);
  const [visibleSections, setVisibleSections] = useState<CardSectionVisibility>(initialDesign.visibleSections);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const name = defaults.name ?? "";
  const productOrServiceName = defaults.productOrServiceName ?? "";
  const requiredStamps = defaults.requiredStamps ?? 1;
  const startingBonusStamps = defaults.startingBonusStamps ?? 0;
  const startingStampPolicy = defaults.startingStampPolicy ?? "FIRST_ENROLLMENT_ONLY";
  const referralRewardBonusStamps = defaults.referralRewardBonusStamps ?? 1;
  const rewardName = defaults.rewardName ?? "";
  const rewardDescription = defaults.rewardDescription ?? "";
  const activeProfessionalPresets = designStudioProfessionalPresetGroups.find((group) => group.category === getDefaultPresetCategory(defaults.businessType))?.presets ?? [];
  const cardDesign = useMemo(
    () =>
      resolveCardDesign({
        layoutStyle,
        cardStyle: getCardStyleForLayoutStyle(layoutStyle),
        stampJourneyStyle,
        stampIcon,
        backgroundStyle,
        backgroundPattern,
        rewardStyle,
        typographyPreset,
        decorationStyle,
        visibleSections,
      }),
    [backgroundPattern, backgroundStyle, decorationStyle, layoutStyle, rewardStyle, stampJourneyStyle, stampIcon, typographyPreset, visibleSections],
  );
  const selectedBackgroundOption = resolveDesignStudioBackgroundGalleryOption(backgroundStyle, backgroundPattern);
  const selectedTypographyOption = resolveDesignStudioTypographyOption(typographyPreset);
  const selectedCardLayoutOption = resolveDesignStudioCardLayoutOption(visibleSections);

  function applyPreset(preset: DesignStudioProfessionalPreset) {
    setLayoutStyle(preset.layoutStyle);
    setBackgroundStyle(preset.backgroundStyle);
    setBackgroundPattern(preset.backgroundPattern);
    setStampJourneyStyle(preset.stampJourneyStyle);
    setStampIcon(preset.stampIcon);
    setRewardStyle(preset.rewardStyle);
    setTypographyPreset(preset.typographyPreset);
    setDecorationStyle(preset.decorationStyle);
    setVisibleSections({ ...preset.visibleSections });
    setSelectedPresetId(preset.id);
  }

  function goToStep(nextStep: 1 | 2) {
    setStep(nextStep);
    window.requestAnimationFrame(() => {
      wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      stepHeadingRef.current?.focus({ preventScroll: true });
    });
  }

  return (
    <form ref={wizardRef} action={action} className="grid gap-6">
      <input type="hidden" name={csrfName} value={csrfToken} />
      <input type="hidden" name="cardTheme" value={defaults.cardTheme ?? "BUSINESS_DEFAULT"} />
      <input type="hidden" name="layoutStyle" value={layoutStyle} />
      <input type="hidden" name="stampJourneyStyle" value={stampJourneyStyle} />
      <input type="hidden" name="stampIcon" value={stampIcon} />
      <input type="hidden" name="backgroundStyle" value={backgroundStyle} />
      <input type="hidden" name="backgroundPattern" value={backgroundPattern} />
      <input type="hidden" name="rewardStyle" value={rewardStyle} />
      <input type="hidden" name="typographyPreset" value={typographyPreset} />
      <input type="hidden" name="decorationStyle" value={decorationStyle} />
      {designStudioCardContentOptions.map((option) => (
        <input key={option.value} type="hidden" name={`visibleSections.${option.value}`} value={visibleSections[option.value] ? "true" : "false"} />
      ))}

      <WizardProgress step={step} />
      <div className="scroll-mt-24 outline-none" tabIndex={-1}>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Step {step} of 2</p>
        <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-2xl font-black text-[#111827] outline-none">
          {step === 1 ? "Program Setup" : "Design Studio"}
        </h2>
      </div>

      <div className={step === 1 ? "grid gap-5" : "hidden"}>
        <SectionCard title="Program Setup" description="Create the loyalty program rules before choosing how the customer card looks.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="name" label="Program Name" defaultValue={name} required />
            <Input name="productOrServiceName" label="Product/Service Name" defaultValue={productOrServiceName} required />
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[#111827]">Description</span>
              <textarea name="description" rows={3} defaultValue={defaults.description ?? ""} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Reward" description="Define the reward customers receive when they complete the program.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="rewardName" label="Reward Name" defaultValue={rewardName} required />
            <Input name="requiredStamps" label="Required Stamps" type="number" min="1" defaultValue={requiredStamps.toString()} required />
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[#111827]">Reward Description</span>
              <textarea name="rewardDescription" rows={3} defaultValue={rewardDescription} required className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Qualification Rules" description="Control when the program is active and how it appears to customers.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="startDate" label="Start Date" type="date" defaultValue={formatInputDate(defaults.startDate)} />
            <Input name="endDate" label="End Date" type="date" defaultValue={formatInputDate(defaults.endDate)} />
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#111827]">Status</span>
              <select name="active" defaultValue={(defaults.active ?? true).toString()} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Starting Stamps" description="Starting stamps are automatically awarded according to the selected policy.">
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="startingBonusStamps" label="Starting Stamps" type="number" min="0" defaultValue={startingBonusStamps.toString()} required />
              <Input name="referralRewardBonusStamps" label="Referral Reward Bonus Stamps" type="number" min="0" defaultValue={referralRewardBonusStamps.toString()} required />
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-[#111827]">Apply when</legend>
              <div className="grid gap-3 md:grid-cols-3">
                <PolicyOption value="NEVER" current={startingStampPolicy} title="Never" description="Customers start each card with 0 starting stamps." />
                <PolicyOption value="FIRST_ENROLLMENT_ONLY" current={startingStampPolicy} title="Only on first enrollment" description="Award starting stamps only when the customer first joins this program." recommended />
                <PolicyOption value="EVERY_COMPLETED_CARD" current={startingStampPolicy} title="Every completed card" description="Award starting stamps after enrollment and after each reward reset." />
              </div>
            </fieldset>
          </div>
        </SectionCard>

      </div>

      <div className={step === 2 ? "grid gap-6" : "hidden"}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="grid gap-5">
            <DesignWizardGroup title="Theme" description="Choose the overall look and brand feel of the card.">
              <SectionCard title="Professional Templates" description="Start with a professionally designed loyalty card for your business type.">
                <div className="grid gap-4 md:grid-cols-2">
                  {activeProfessionalPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:border-blue-500 data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                      data-active={selectedPresetId === preset.id}
                    >
                      <span className="block h-24 rounded-xl border border-[#E2E8F0]" style={{ background: presetPreviewBackground(preset) }} />
                      <span className="mt-4 block text-base font-black text-[#111827]">{preset.name}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#64748B]">{preset.description}</span>
                      <span className="mt-3 inline-flex rounded-full business-bg px-3 py-1 text-xs font-black">{selectedPresetId === preset.id ? "Selected" : "Use Template"}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Card Style" description="Choose the overall personality of your loyalty card.">
                <OptionGrid options={designStudioTemplateOptions} value={layoutStyle} onChange={(value) => setLayoutStyle(value as CardDesignLayoutStyle)} />
              </SectionCard>

              <SectionCard title="Background" description="Choose the visual background for this loyalty card.">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {designStudioBackgroundGalleryOptions.map((option) => {
                    const active = selectedBackgroundOption.id === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setBackgroundStyle(option.backgroundStyle);
                          setBackgroundPattern(option.backgroundPattern);
                        }}
                        data-active={active}
                        aria-pressed={active}
                        className="group grid min-h-40 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)]"
                      >
                        <BackgroundGalleryThumbnail option={option} />
                        <span className="flex items-start justify-between gap-3 px-1 pb-1">
                          <span className="min-w-0">
                            <span className="block text-sm font-black text-[#111827]">{option.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-[#64748B]">{option.description}</span>
                          </span>
                          <span className="rounded-full border border-[#E2E8F0] bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#64748B] opacity-0 transition group-data-[active=true]:border-[var(--business-primary)] group-data-[active=true]:business-bg group-data-[active=true]:opacity-100">
                            Selected
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            </DesignWizardGroup>

            <DesignWizardGroup title="Rewards" description="Customize how customers collect visits and understand their reward.">
              <SectionCard title="Stamp Design" description="Choose the marker customers see as they collect stamps.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stampIconOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStampIcon(option.value)}
                      data-active={stampIcon === option.value}
                      className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#E2E8F0] bg-white text-[#111827]">
                        <StampIconGraphic stampIcon={option.value} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-[#111827]">{option.label}</span>
                        {option.recommended ? <span className="mt-1 inline-flex rounded-full business-bg px-2 py-0.5 text-[10px] font-black">Recommended</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Reward Progress" description="Choose how customers see progress toward their next reward.">
                <OptionGrid options={designStudioStampJourneyOptions} value={stampJourneyStyle} onChange={(value) => setStampJourneyStyle(value as CardDesignStampJourneyStyle)} />
              </SectionCard>

              <SectionCard title="Reward Box" description="Choose how rewards are presented to your customers.">
                <OptionGrid options={designStudioRewardStyleOptions} value={rewardStyle} onChange={(value) => setRewardStyle(value as CardDesignRewardStyle)} />
              </SectionCard>
            </DesignWizardGroup>

            <DesignWizardGroup title="Layout" description="Control the card structure and information shown to customers.">
              <SectionCard title="Card Layout" description="Choose how much information appears on the loyalty card.">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {designStudioCardLayoutOptions.map((option) => {
                    const active = selectedCardLayoutOption.id === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setVisibleSections({ ...option.visibleSections })}
                        data-active={active}
                        aria-pressed={active}
                        className="group grid min-h-36 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)]"
                      >
                        <CardLayoutThumbnail visibleSections={option.visibleSections} />
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-sm font-black text-[#111827]">{option.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-[#64748B]">{option.description}</span>
                          </span>
                          <span className="rounded-full border border-[#E2E8F0] bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#64748B] opacity-0 transition group-data-[active=true]:border-[var(--business-primary)] group-data-[active=true]:business-bg group-data-[active=true]:opacity-100">
                            Selected
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <details className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)]">
                    Advanced section visibility
                  </summary>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {designStudioCardContentOptions.map((option) => (
                      <label key={option.value} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
                        <span>
                          <span className="block text-sm font-black text-[#111827]">{option.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-[#64748B]">{option.description}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={visibleSections[option.value]}
                          onChange={() => setVisibleSections((current) => ({ ...current, [option.value]: !current[option.value] }))}
                          className="h-5 w-5 accent-[var(--business-primary)]"
                        />
                      </label>
                    ))}
                  </div>
                </details>
              </SectionCard>

              <SectionCard title="Typography" description="Choose the personality of your loyalty card.">
                <OptionGrid options={designStudioTypographyOptions} value={selectedTypographyOption.value} onChange={(value) => setTypographyPreset(value as CardDesignTypographyPreset)} />
              </SectionCard>
            </DesignWizardGroup>
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-6">
            <SectionCard title="Live Preview" description="This preview updates before the program is created.">
              <CreateCardPreview
                businessName={businessName}
                branding={branding}
                cardDesign={cardDesign}
                stampJourneyStyle={stampJourneyStyle}
                stampIcon={stampIcon}
                rewardStyle={rewardStyle}
                visibleSections={visibleSections}
              />
            </SectionCard>
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-between gap-3 border-t border-[#E5E7EB] bg-white/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {step === 1 ? (
          <>
            <span className="hidden text-xs text-[#9CA3AF] sm:block">Nothing is created until you finish card design.</span>
            <Button type="button" variant="business" onClick={() => goToStep(2)} rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />} className="ml-auto">
              Continue to card design
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => goToStep(1)} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
              Back
            </Button>
            <Button type="submit" variant="business" leftIcon={<Check className="h-4 w-4" aria-hidden />}>
              {submitLabel}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function WizardProgress({ step }: { step: 1 | 2 }) {
  const steps: Array<{ n: 1 | 2; label: string; sub: string }> = [
    { n: 1, label: "Program setup", sub: "Rules and reward" },
    { n: 2, label: "Card design", sub: "Look and feel" },
  ];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E7E9EE] bg-white p-4">
      {steps.map((item, index) => {
        const active = step === item.n;
        const done = step > item.n;
        return (
          <div key={item.n} className="flex flex-1 items-center gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-emerald-100 text-emerald-700" : active ? "business-button text-white" : "bg-[#F1F3F5] text-[#9CA3AF]"}`}>
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : item.n}
              </span>
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${active || done ? "text-[#111827]" : "text-[#9CA3AF]"}`}>{item.label}</p>
                <p className={`truncate text-xs ${done ? "text-emerald-600" : "text-[#9CA3AF]"}`}>{done ? "Complete" : item.sub}</p>
              </div>
            </div>
            {index < steps.length - 1 ? <span className={`h-0.5 flex-1 rounded-full ${step > item.n ? "business-button" : "bg-[#EEF1F4]"}`} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function OptionGrid({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; description: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          data-active={value === option.value}
          className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)]"
        >
          <span className="block text-sm font-black text-[#111827]">{option.label}</span>
          <span className="mt-1 block text-xs leading-5 text-[#64748B]">{option.description}</span>
        </button>
      ))}
    </div>
  );
}

function DesignWizardGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F8FAFC] p-3 shadow-sm sm:p-4">
      <div className="px-1 pb-4">
        <h3 className="text-lg font-black tracking-tight text-[#111827]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Input({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} min={min} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
    </label>
  );
}

function PolicyOption({
  value,
  current,
  title,
  description,
  recommended = false,
}: {
  value: StartingStampPolicy;
  current: StartingStampPolicy;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <label className="flex min-h-24 cursor-pointer gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[var(--business-primary)] has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)]">
      <input type="radio" name="startingStampPolicy" value={value} defaultChecked={current === value} className="mt-1 h-4 w-4 accent-[var(--business-primary)]" />
      <span>
        <span className="block text-sm font-semibold text-[#111827]">
          {title} {recommended ? <span className="text-xs font-bold business-text">(Recommended)</span> : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{description}</span>
      </span>
    </label>
  );
}

function CreateCardPreview({
  businessName,
  branding,
  cardDesign,
  stampJourneyStyle,
  stampIcon,
  rewardStyle,
  visibleSections,
}: {
  businessName: string;
  branding: ProgramPreviewBranding;
  cardDesign: ReturnType<typeof resolveCardDesign>;
  stampJourneyStyle: CardDesignStampJourneyStyle;
  stampIcon: CardDesignStampIcon;
  rewardStyle: CardDesignRewardStyle;
  visibleSections: CardSectionVisibility;
}) {
  const theme = resolveCardThemeColors({ branding, cardDesign });
  const typography = createPreviewTypographyStyles[cardDesign.typographyPreset] ?? createPreviewTypographyStyles.MODERN;
  const reward = createPreviewRewardStyles[rewardStyle] ?? createPreviewRewardStyles.FILLED;

  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-[#F8FAFC] p-2 shadow-xl sm:p-3">
      <WalletCardShell theme={theme} cardDesign={cardDesign} className="max-w-full" exportMode>
        <div className="px-4 py-4 sm:px-5 sm:py-5" style={{ color: theme.cardText }}>
        {(visibleSections.logo || visibleSections.businessName || visibleSections.programName) ? (
          <div className="flex items-center gap-3">
            {visibleSections.logo ? (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black" style={{ background: theme.logoBackground, color: theme.logoText }}>
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  businessName.slice(0, 1).toUpperCase()
                )}
              </div>
            ) : null}
            <div className="min-w-0">
              {visibleSections.businessName ? <p className="line-clamp-2 text-[13px] font-black leading-tight">{businessName}</p> : null}
              {visibleSections.programName ? <p className="mt-0.5 truncate text-[11px] font-semibold" style={{ color: theme.mutedText }}>Loyalty Program</p> : null}
            </div>
          </div>
        ) : null}
        {visibleSections.customerName ? (
          <div className="mt-4">
            <p className={typography.label} style={{ color: theme.mutedText }}>Customer</p>
            <h3 className={typography.customer}>Customer Name</h3>
            <p className={typography.supporting} style={{ color: theme.mutedText }}>Member since today</p>
          </div>
        ) : null}
        {visibleSections.tierBadge ? (
          <p className="mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ background: theme.badgeBackground, color: theme.badgeText, borderColor: theme.badgeBorder }}>
            Silver Member
          </p>
        ) : null}
        {visibleSections.progress ? (
          <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-3">
            <p className={typography.label} style={{ color: theme.mutedText }}>Progress</p>
            <ProgressPreview style={stampJourneyStyle} icon={stampIcon} theme={theme} />
            {visibleSections.visits ? <p className="mt-2 text-xs font-semibold" style={{ color: theme.mutedText }}>3 visits until reward</p> : null}
          </div>
        ) : null}
        {visibleSections.rewardBox ? (
          <div className={`relative mt-4 overflow-hidden rounded-2xl border p-4 ${reward.className}`} style={{ ...reward.style, color: reward.textColor }}>
            {rewardStyle === "TICKET" ? (
              <>
                <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" style={{ background: theme.cardBackground }} />
                <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" style={{ background: theme.cardBackground }} />
              </>
            ) : null}
            <p className={typography.label} style={{ color: reward.mutedColor }}>Next Reward</p>
            <p className={typography.reward}>Free Reward</p>
            <p className="mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: reward.badgeBackground, color: reward.badgeColor }}>3 Visits Remaining</p>
          </div>
        ) : null}
        {visibleSections.qr ? <QrPreview /> : null}
        {visibleSections.referral ? <div className="mt-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-semibold">Refer a friend and share this loyalty card.</div> : null}
        {visibleSections.footer ? <p className="mt-4 rounded-full px-4 py-2.5 text-center text-xs font-black" style={{ background: theme.ctaBackground, color: theme.ctaForeground }}>Scan at Checkout</p> : null}
        </div>
      </WalletCardShell>
    </div>
  );
}

function ProgressPreview({ style, icon, theme }: { style: CardDesignStampJourneyStyle; icon: CardDesignStampIcon; theme: WalletTheme }) {
  const completed = 7;
  const total = 10;

  if (style === "PROGRESS_BAR") {
    return (
      <div className="mt-2 grid gap-2">
        <p className="text-lg font-black">7 / 10 Visits</p>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: theme.progressTrack }}>
          <div className="h-full w-[70%] rounded-full" style={{ background: theme.progressFill }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-2">
      <p className="text-lg font-black">7 / 10 Visits</p>
      <div className={style === "CONNECTED_DOTS" ? "relative grid grid-cols-5 gap-2 py-1" : "grid grid-cols-5 gap-2"}>
        {style === "CONNECTED_DOTS" ? <span className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ background: theme.progressTrack }} /> : null}
        {style === "CONNECTED_DOTS" ? <span className="absolute left-3 top-1/2 h-1 w-[68%] -translate-y-1/2 rounded-full" style={{ background: theme.progressFill }} /> : null}
        {Array.from({ length: total }).map((_, index) => {
          const filled = index < completed;
          return (
            <StampSlot key={index} stampIcon={icon} filled={filled} className="relative z-10 aspect-square min-h-7 w-full" iconClassName="h-4 w-4" />
          );
        })}
      </div>
    </div>
  );
}

function QrPreview() {
  return (
    <div className="mt-4 rounded-2xl bg-white p-3 text-[#111827] ring-1 ring-black/10">
      <div className="grid gap-2 text-center">
        <span className="text-sm font-black">Scan at Checkout</span>
        <span className="mx-auto grid h-24 w-24 grid-cols-7 grid-rows-7 gap-0.5 rounded-xl bg-white p-2 shadow-inner ring-1 ring-black/10">
          {Array.from({ length: 49 }).map((_, index) => (
            <span key={index} className={qrPreviewCells.has(index) ? "rounded-[1px] bg-[#111827]" : "rounded-[1px] bg-[#F8FAFC]"} />
          ))}
        </span>
        <span className="text-xs font-semibold text-[#64748B]">Present this QR to staff</span>
      </div>
    </div>
  );
}

const qrPreviewCells = new Set([0, 1, 2, 4, 5, 6, 7, 9, 11, 13, 14, 15, 16, 18, 19, 20, 22, 24, 25, 28, 29, 31, 33, 34, 36, 38, 39, 41, 42, 43, 44, 46, 48]);

const createPreviewTypographyStyles: Record<CardDesignTypographyPreset, {
  label: string;
  customer: string;
  reward: string;
  supporting: string;
}> = {
  MODERN: { label: "text-[10px] font-semibold uppercase tracking-[0.24em]", customer: "mt-1.5 text-[1.55rem] font-black leading-[1.05]", reward: "mt-1.5 text-lg font-black leading-tight", supporting: "mt-1 text-xs" },
  CLASSIC: { label: "text-[10px] font-semibold uppercase tracking-[0.18em]", customer: "mt-1.5 text-[1.5rem] font-bold leading-[1.12]", reward: "mt-1.5 text-lg font-bold leading-tight", supporting: "mt-1 text-xs" },
  PREMIUM: { label: "text-[10px] font-black uppercase tracking-[0.26em]", customer: "mt-1.5 text-[1.6rem] font-black leading-none tracking-tight", reward: "mt-1.5 text-lg font-black leading-tight tracking-tight", supporting: "mt-1 text-xs font-semibold" },
  LUXURY: { label: "text-[10px] font-semibold uppercase tracking-[0.32em]", customer: "mt-1.5 text-[1.45rem] font-semibold leading-[1.15] tracking-wide", reward: "mt-1.5 text-lg font-semibold leading-tight tracking-wide", supporting: "mt-1 text-xs" },
  PLAYFUL: { label: "text-[10px] font-black uppercase tracking-[0.16em]", customer: "mt-1.5 text-[1.55rem] font-black leading-[1.08]", reward: "mt-1.5 text-lg font-black leading-tight", supporting: "mt-1 text-xs font-semibold" },
  MINIMAL: { label: "text-[10px] font-medium uppercase tracking-[0.24em]", customer: "mt-1.5 text-[1.45rem] font-light leading-[1.15] tracking-wide", reward: "mt-1.5 text-lg font-light leading-tight tracking-wide", supporting: "mt-1 text-xs" },
};

const createPreviewRewardStyles: Record<CardDesignRewardStyle, {
  className: string;
  style: { background?: string; backgroundColor?: string; borderColor: string; boxShadow?: string };
  textColor: string;
  mutedColor: string;
  badgeBackground: string;
  badgeColor: string;
}> = {
  FILLED: { className: "", style: { background: "var(--business-primary)", borderColor: "var(--business-primary)", boxShadow: "0 18px 38px rgba(15, 23, 42, 0.14)" }, textColor: "var(--business-primary-foreground)", mutedColor: "var(--business-primary-foreground)", badgeBackground: "rgba(255,255,255,0.22)", badgeColor: "var(--business-primary-foreground)" },
  OUTLINE: { className: "bg-white", style: { borderColor: "var(--business-primary)" }, textColor: "#111827", mutedColor: "var(--business-primary)", badgeBackground: "var(--business-primary-soft)", badgeColor: "var(--business-primary)" },
  GLASS: { className: "bg-white/70", style: { borderColor: "rgba(255,255,255,0.72)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72), 0 18px 38px rgba(15, 23, 42, 0.10)" }, textColor: "#111827", mutedColor: "#64748B", badgeBackground: "rgba(255,255,255,0.78)", badgeColor: "#111827" },
  PREMIUM: { className: "", style: { background: "linear-gradient(135deg, #111827 0%, #312E81 100%)", borderColor: "rgba(249,115,22,0.48)", boxShadow: "0 20px 42px rgba(17, 24, 39, 0.22)" }, textColor: "#FFFFFF", mutedColor: "#FDBA74", badgeBackground: "rgba(249,115,22,0.22)", badgeColor: "#FDBA74" },
  TICKET: { className: "bg-white", style: { borderColor: "var(--business-primary)", boxShadow: "0 14px 30px rgba(15, 23, 42, 0.10)" }, textColor: "#111827", mutedColor: "var(--business-primary)", badgeBackground: "var(--business-primary)", badgeColor: "var(--business-primary-foreground)" },
};

function getDefaultPresetCategory(businessType: BusinessType): DesignStudioProfessionalPreset["category"] {
  if (businessType === "RESTAURANT") return "Restaurant";
  if (businessType === "COFFEE_SHOP") return "Cafe";
  if (businessType === "BEAUTY_SALON") return "Beauty Salon";
  if (businessType === "BARBERSHOP") return "Barbershop";
  if (businessType === "CAR_CARE_CENTER") return "Car Wash";
  return "General";
}

function presetPreviewBackground(preset: DesignStudioProfessionalPreset) {
  if (preset.layoutStyle === "PREMIUM") return "linear-gradient(135deg,#111827,#334155)";
  if (preset.layoutStyle === "LUXURY") return "linear-gradient(135deg,#F8FAFC,#FDE68A)";
  if (preset.backgroundStyle === "GRADIENT") return "linear-gradient(135deg,#F97316,#FDBA74)";
  return "#F8FAFC";
}

function formatInputDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
