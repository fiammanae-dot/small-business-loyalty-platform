"use client";

import { useMemo, useRef, useState } from "react";
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
  designStudioBackgroundPatternOptions,
  designStudioBackgroundStyleOptions,
  designStudioCardContentOptions,
  designStudioCardFinishOptions,
  designStudioProfessionalPresetGroups,
  designStudioRewardStyleOptions,
  designStudioStampJourneyOptions,
  designStudioTemplateOptions,
  designStudioTypographyOptions,
  type DesignStudioProfessionalPreset,
} from "@/lib/design-studio";
import { Button, SectionCard } from "@/components/ui";
import { StampIconGraphic } from "@/components/design-studio/StampIconGraphic";

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

        <SectionCard title="Continue to Design Studio" description="The program will not be created until you review the card design and click Create Program.">
          <Button type="button" variant="business" onClick={() => goToStep(2)}>
            Continue to Design Studio
          </Button>
        </SectionCard>
      </div>

      <div className={step === 2 ? "grid gap-6" : "hidden"}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="grid gap-5">
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

            <SectionCard title="Background" description="Choose the background feeling for this loyalty card.">
              <OptionGrid options={designStudioBackgroundStyleOptions} value={backgroundStyle} onChange={(value) => setBackgroundStyle(value as BackgroundStyle)} />
              <div className="mt-4">
                <OptionGrid options={designStudioBackgroundPatternOptions} value={backgroundPattern} onChange={(value) => {
                  setBackgroundPattern(value as CardDesignBackgroundPattern);
                  if (value !== "NONE") setBackgroundStyle("PATTERN");
                }} />
              </div>
            </SectionCard>

            <SectionCard title="Reward Progress" description="Choose how customers see progress toward their next reward.">
              <OptionGrid options={designStudioStampJourneyOptions} value={stampJourneyStyle} onChange={(value) => setStampJourneyStyle(value as CardDesignStampJourneyStyle)} />
            </SectionCard>

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

            <SectionCard title="Reward Box" description="Choose how rewards are presented to your customers.">
              <OptionGrid options={designStudioRewardStyleOptions} value={rewardStyle} onChange={(value) => setRewardStyle(value as CardDesignRewardStyle)} />
            </SectionCard>

            <SectionCard title="Typography" description="Choose the personality of your loyalty card.">
              <OptionGrid options={designStudioTypographyOptions} value={typographyPreset} onChange={(value) => setTypographyPreset(value as CardDesignTypographyPreset)} />
            </SectionCard>

            <SectionCard title="Card Finish" description="Choose the visual finish that best matches your brand.">
              <OptionGrid options={designStudioCardFinishOptions} value={decorationStyle} onChange={(value) => setDecorationStyle(value as CardDesignDecorationStyle)} />
            </SectionCard>

            <SectionCard title="Card Content" description="Choose what your customers see on their loyalty card.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            </SectionCard>
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-6">
            <SectionCard title="Live Preview" description="This preview updates before the program is created.">
              <CreateCardPreview
                businessName={businessName}
                branding={branding}
                cardDesign={cardDesign}
                layoutStyle={layoutStyle}
                stampJourneyStyle={stampJourneyStyle}
                stampIcon={stampIcon}
                rewardStyle={rewardStyle}
                visibleSections={visibleSections}
              />
            </SectionCard>
            <SectionCard title="Create Program" description="Create the program and save this card design at the same time.">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => goToStep(1)}>
                  Back to Program Setup
                </Button>
                <Button type="submit" variant="business">
                  {submitLabel}
                </Button>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </form>
  );
}

function WizardProgress({ step }: { step: 1 | 2 }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:grid-cols-2">
      {[
        ["1", "Program Setup"],
        ["2", "Design Studio"],
      ].map(([number, label]) => {
        const active = step.toString() === number;
        return (
          <div key={number} className={`rounded-xl border p-3 ${active ? "business-border-soft business-bg-soft" : "border-[#E2E8F0] bg-[#F8FAFC]"}`}>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">Step {number}</p>
            <p className="mt-1 text-sm font-black text-[#111827]">{label}</p>
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
  layoutStyle,
  stampJourneyStyle,
  stampIcon,
  rewardStyle,
  visibleSections,
}: {
  businessName: string;
  branding: ProgramPreviewBranding;
  cardDesign: ReturnType<typeof resolveCardDesign>;
  layoutStyle: CardDesignLayoutStyle;
  stampJourneyStyle: CardDesignStampJourneyStyle;
  stampIcon: CardDesignStampIcon;
  rewardStyle: CardDesignRewardStyle;
  visibleSections: CardSectionVisibility;
}) {
  const dark = layoutStyle === "PREMIUM";
  const cardBackground = dark ? "#111827" : cardDesign.backgroundStyle === "GRADIENT" ? `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` : "#FFFFFF";
  const textColor = dark ? "#FFFFFF" : "#111827";
  const mutedColor = dark ? "rgba(255,255,255,.72)" : "#64748B";
  const rewardClass =
    rewardStyle === "OUTLINE"
      ? "border border-current bg-transparent"
      : rewardStyle === "TICKET"
        ? "border border-dashed bg-white/90"
        : rewardStyle === "GLASS"
          ? "border border-white/50 bg-white/40"
          : "bg-white/90";

  return (
    <div className="mx-auto max-w-[340px] rounded-[2rem] border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-xl">
      <div className="rounded-[1.5rem] p-5 shadow-sm" style={{ background: cardBackground, color: textColor }}>
        {(visibleSections.logo || visibleSections.businessName || visibleSections.programName) ? (
          <div className="flex items-center gap-3">
            {visibleSections.logo ? (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white font-black text-[#111827]">
                {businessName.slice(0, 1).toUpperCase()}
              </div>
            ) : null}
            <div className="min-w-0">
              {visibleSections.businessName ? <p className="line-clamp-2 text-sm font-black">{businessName}</p> : null}
              {visibleSections.programName ? <p className="text-xs" style={{ color: mutedColor }}>Loyalty Program</p> : null}
            </div>
          </div>
        ) : null}
        {visibleSections.customerName ? <h3 className="mt-6 text-2xl font-black">Customer Name</h3> : null}
        {visibleSections.tierBadge ? <p className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black">Silver Member</p> : null}
        {visibleSections.progress ? (
          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: mutedColor }}>Progress</p>
            <p className="mt-2 text-lg font-black">7 / 10 Visits</p>
            <ProgressPreview style={stampJourneyStyle} icon={stampIcon} />
            {visibleSections.visits ? <p className="mt-2 text-xs" style={{ color: mutedColor }}>3 visits until reward</p> : null}
          </div>
        ) : null}
        {visibleSections.rewardBox ? (
          <div className={`mt-6 rounded-2xl p-4 text-[#111827] ${rewardClass}`}>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">Next Reward</p>
            <p className="mt-2 text-base font-black">Free Reward</p>
          </div>
        ) : null}
        {visibleSections.qr ? <div className="mt-6 grid h-20 place-items-center rounded-2xl bg-white text-xs font-black text-[#111827]">QR</div> : null}
        {visibleSections.footer ? <p className="mt-5 text-center text-xs font-bold" style={{ color: mutedColor }}>Scan at Checkout</p> : null}
      </div>
    </div>
  );
}

function ProgressPreview({ style, icon }: { style: CardDesignStampJourneyStyle; icon: CardDesignStampIcon }) {
  if (style === "PROGRESS_BAR") {
    return (
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
        <div className="h-full w-[70%] rounded-full business-bg" />
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-black ${index < 3 ? "business-bg" : "bg-white/30"}`}>
          <StampIconGraphic stampIcon={icon} mode="customer" className="h-4 w-4" />
        </span>
      ))}
    </div>
  );
}

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
