"use client";

import { useMemo, useState, type ReactNode } from "react";
import type {
  CardDesignBackgroundPattern,
  CardDesignBackgroundStyle,
  CardDesignDecorationStyle,
  CardDesignLayoutStyle,
  CardDesignRewardStyle,
  CardSection,
  CardSectionVisibility,
  CardDesignStampIcon,
  CardDesignStampJourneyStyle,
  CardDesignTypographyPreset,
} from "@/lib/card-design";
import { getCardThemeForLayoutStyle, getCardStyleForLayoutStyle, resolveCardDesign } from "@/lib/card-design";
import { resolveCardThemeColors } from "@/lib/card-themes";
import {
  designStudioBackgroundPatternOptions,
  designStudioBackgroundStyleOptions,
  designStudioCardFinishOptions,
  designStudioCardContentOptions,
  designStudioProfessionalPresetGroups,
  designStudioProfessionalPresets,
  designStudioRewardStyleOptions,
  designStudioStampJourneyOptions,
  designStudioTemplateOptions,
  designStudioTypographyOptions,
  type DesignStudioProfessionalPreset,
} from "@/lib/design-studio";
import { Button, SectionCard } from "@/components/ui";

type PreviewBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  logoUrl: string | null;
};

type DesignStudioPresetDesign = {
  layoutStyle: CardDesignLayoutStyle;
  stampJourneyStyle: CardDesignStampJourneyStyle;
  stampIcon: CardDesignStampIcon;
  backgroundStyle: "SOLID" | "GRADIENT" | "PATTERN";
  backgroundPattern: CardDesignBackgroundPattern;
  rewardStyle: CardDesignRewardStyle;
  typographyPreset: CardDesignTypographyPreset;
  decorationStyle: CardDesignDecorationStyle;
  visibleSections: CardSectionVisibility;
};

type BusinessDesignPresetOption = {
  uuid: string;
  name: string;
  createdAt: string;
  cardDesign: DesignStudioPresetDesign;
};

type SourceProgramDesignOption = {
  uuid: string;
  name: string;
  cardDesign: DesignStudioPresetDesign;
};

type DesignStartMode = "quick" | "manual";

export function ProgramDesignStudioForm({
  action,
  savePresetAction,
  renamePresetAction,
  deletePresetAction,
  csrfName,
  csrfToken,
  programUuid,
  businessName,
  programName,
  rewardName,
  branding,
  initialDesign,
  businessPresets,
  sourcePrograms,
  stampIconOptions,
}: {
  action: (formData: FormData) => void | Promise<void>;
  savePresetAction: (formData: FormData) => void | Promise<void>;
  renamePresetAction: (formData: FormData) => void | Promise<void>;
  deletePresetAction: (formData: FormData) => void | Promise<void>;
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
    backgroundStyle: CardDesignBackgroundStyle;
    backgroundPattern: CardDesignBackgroundPattern;
    rewardStyle: CardDesignRewardStyle;
    typographyPreset: CardDesignTypographyPreset;
    decorationStyle: CardDesignDecorationStyle;
    visibleSections: CardSectionVisibility;
  };
  businessPresets: BusinessDesignPresetOption[];
  sourcePrograms: SourceProgramDesignOption[];
  stampIconOptions: Array<{ value: CardDesignStampIcon; label: string; recommended: boolean }>;
}) {
  const [layoutStyle, setLayoutStyle] = useState(initialDesign.layoutStyle);
  const [stampJourneyStyle, setStampJourneyStyle] = useState(initialDesign.stampJourneyStyle);
  const [stampIcon, setStampIcon] = useState(initialDesign.stampIcon);
  const [backgroundStyle, setBackgroundStyle] = useState<"SOLID" | "GRADIENT" | "PATTERN">(
    initialDesign.backgroundStyle === "GRADIENT" || initialDesign.backgroundStyle === "PATTERN" || initialDesign.backgroundStyle === "INDUSTRY_PATTERN"
      ? initialDesign.backgroundStyle === "GRADIENT"
        ? "GRADIENT"
        : "PATTERN"
      : "SOLID",
  );
  const [backgroundPattern, setBackgroundPattern] = useState(initialDesign.backgroundPattern);
  const [rewardStyle, setRewardStyle] = useState(initialDesign.rewardStyle);
  const [typographyPreset, setTypographyPreset] = useState(initialDesign.typographyPreset);
  const [decorationStyle, setDecorationStyle] = useState(initialDesign.decorationStyle);
  const [visibleSections, setVisibleSections] = useState<CardSectionVisibility>(initialDesign.visibleSections);
  const [designStartMode, setDesignStartMode] = useState<DesignStartMode>("quick");
  const [presetApplied, setPresetApplied] = useState(false);
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
  const selectedBackgroundLabel = designStudioBackgroundStyleOptions.find((option) => option.value === backgroundStyle)?.label ?? backgroundStyle;
  const selectedPatternLabel = designStudioBackgroundPatternOptions.find((option) => option.value === backgroundPattern)?.label ?? backgroundPattern;
  const selectedRewardStyleLabel = designStudioRewardStyleOptions.find((option) => option.value === rewardStyle)?.label ?? rewardStyle;
  const selectedTypographyLabel = designStudioTypographyOptions.find((option) => option.value === typographyPreset)?.label ?? typographyPreset;
  const selectedFinishLabel = designStudioCardFinishOptions.find((option) => option.value === decorationStyle)?.label ?? decorationStyle;
  const enabledContentCount = designStudioCardContentOptions.filter((option) => visibleSections[option.value]).length;
  const activePresetId =
    designStudioProfessionalPresets.find(
      (option) =>
        option.layoutStyle === layoutStyle &&
        option.backgroundStyle === backgroundStyle &&
        option.backgroundPattern === backgroundPattern &&
        option.stampJourneyStyle === stampJourneyStyle &&
        option.stampIcon === stampIcon &&
        option.rewardStyle === rewardStyle &&
        option.typographyPreset === typographyPreset &&
        option.decorationStyle === decorationStyle &&
        sectionVisibilityMatches(option.visibleSections, visibleSections),
    )?.id ?? null;
  const manualEditorVisible = designStartMode === "manual" || presetApplied;

  const applyProfessionalPreset = (preset: DesignStudioProfessionalPreset) => {
    setLayoutStyle(preset.layoutStyle);
    setBackgroundStyle(preset.backgroundStyle);
    setBackgroundPattern(preset.backgroundPattern);
    setStampJourneyStyle(preset.stampJourneyStyle);
    setStampIcon(preset.stampIcon);
    setRewardStyle(preset.rewardStyle);
    setTypographyPreset(preset.typographyPreset);
    setDecorationStyle(preset.decorationStyle);
    setVisibleSections(preset.visibleSections);
    setPresetApplied(true);
  };

  const applyBusinessPreset = (preset: BusinessDesignPresetOption) => {
    setLayoutStyle(preset.cardDesign.layoutStyle);
    setBackgroundStyle(preset.cardDesign.backgroundStyle);
    setBackgroundPattern(preset.cardDesign.backgroundPattern);
    setStampJourneyStyle(preset.cardDesign.stampJourneyStyle);
    setStampIcon(preset.cardDesign.stampIcon);
    setRewardStyle(preset.cardDesign.rewardStyle);
    setTypographyPreset(preset.cardDesign.typographyPreset);
    setDecorationStyle(preset.cardDesign.decorationStyle);
    setVisibleSections(preset.cardDesign.visibleSections);
    setPresetApplied(true);
  };

  const applySourceProgramDesign = (sourceProgram: SourceProgramDesignOption) => {
    setLayoutStyle(sourceProgram.cardDesign.layoutStyle);
    setBackgroundStyle(sourceProgram.cardDesign.backgroundStyle);
    setBackgroundPattern(sourceProgram.cardDesign.backgroundPattern);
    setStampJourneyStyle(sourceProgram.cardDesign.stampJourneyStyle);
    setStampIcon(sourceProgram.cardDesign.stampIcon);
    setRewardStyle(sourceProgram.cardDesign.rewardStyle);
    setTypographyPreset(sourceProgram.cardDesign.typographyPreset);
    setDecorationStyle(sourceProgram.cardDesign.decorationStyle);
    setVisibleSections(sourceProgram.cardDesign.visibleSections);
    setPresetApplied(true);
  };

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,65fr)_minmax(340px,35fr)] lg:items-start xl:grid-cols-[minmax(0,65fr)_minmax(400px,35fr)] 2xl:gap-10">
      <input type="hidden" name={csrfName} value={csrfToken} />
      <input type="hidden" name="programUuid" value={programUuid} />
      <input type="hidden" name="backgroundStyle" value={backgroundStyle} />
      <input type="hidden" name="backgroundPattern" value={backgroundPattern} />
      <input type="hidden" name="rewardStyle" value={rewardStyle} />
      <input type="hidden" name="typographyPreset" value={typographyPreset} />
      <input type="hidden" name="decorationStyle" value={decorationStyle} />
      {designStudioCardContentOptions.map((option) => (
        <input key={option.value} type="hidden" name={`visibleSections.${option.value}`} value={visibleSections[option.value] ? "true" : "false"} />
      ))}

      <aside className="order-first grid h-fit min-w-0 gap-5 lg:sticky lg:top-6 lg:order-last lg:self-start">
        <SectionCard
          title="Live Preview"
          description="See how this program's loyalty card feels before saving."
          className="rounded-3xl border-[var(--business-primary-soft,#E2E8F0)] bg-gradient-to-b from-white to-[#F8FAFC] p-5 shadow-lg shadow-slate-200/60 md:p-6"
        >
          <TypographyCardPreview
            businessName={businessName}
            customerName="Mina Hanna"
            progress="7 / 10"
            rewardName={rewardName}
            typographyPreset={typographyPreset}
          />
          <CardFinishPreviewFrame decorationStyle={decorationStyle}>
            <VisibleCardPreview
              businessName={businessName}
              businessLogoUrl={branding.logoUrl}
              customerName="Mina Hanna"
              memberSince="Jun 2026"
              tierLabel="Silver Member"
              tierIcon="S"
              theme={previewTheme}
              programName={programName}
              rewardName={rewardName}
              visibleSections={visibleSections}
            />
          </CardFinishPreviewFrame>
          {visibleSections.rewardBox ? <RewardBoxPreview rewardName={rewardName} rewardStyle={rewardStyle} /> : null}
          {visibleSections.progress ? <CardProgressPreview journeyStyle={stampJourneyStyle} stampIcon={stampIcon} stampIconLabel={selectedIconLabel} /> : null}
          <div className="mt-5 grid gap-2 rounded-2xl border border-[#E5E7EB] bg-white/85 p-4 text-sm shadow-sm">
            <PreviewLine label="Card Style" value={selectedStyleLabel} />
            <PreviewLine label="Reward Progress" value={selectedJourneyLabel} />
            <PreviewLine label="Stamp Design" value={selectedIconLabel} />
            <PreviewLine label="Background" value={`${selectedBackgroundLabel} / ${selectedPatternLabel}`} />
            <PreviewLine label="Reward Box" value={selectedRewardStyleLabel} />
            <PreviewLine label="Typography" value={selectedTypographyLabel} />
            <PreviewLine label="Card Finish" value={selectedFinishLabel} />
            <PreviewLine label="Card Content" value={`${enabledContentCount} sections shown`} />
          </div>
        </SectionCard>
      </aside>

      <div className="order-last grid min-w-0 gap-6 lg:order-first lg:max-w-[920px] [&>section]:rounded-2xl [&>section]:p-5 md:[&>section]:p-6">
        <SectionCard title="How would you like to start?" description="Choose a guided preset or open the full editor immediately.">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setDesignStartMode("quick")}
              className="group grid min-h-48 gap-4 rounded-[1.35rem] border border-[var(--business-primary)] bg-[var(--business-primary-soft)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=false]:border-[#E2E8F0] data-[active=false]:bg-white"
              data-active={designStartMode === "quick"}
              aria-pressed={designStartMode === "quick"}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] business-text">Recommended</span>
                  <span className="text-xl font-black text-[#111827]">Quick Start</span>
                </span>
                <span className="rounded-full border border-[var(--business-primary)] bg-white px-3 py-1 text-xs font-bold business-text">Preset</span>
              </span>
              <span className="text-sm leading-6 text-[#64748B]">Start with a professionally designed template recommended for your business.</span>
              <span className="mt-auto inline-flex w-fit items-center rounded-xl business-bg px-4 py-2 text-sm font-bold transition group-hover:shadow-md">
                Choose a Preset
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDesignStartMode("manual")}
              className="group grid min-h-48 gap-4 rounded-[1.35rem] border border-[#E2E8F0] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)]"
              data-active={designStartMode === "manual"}
              aria-pressed={designStartMode === "manual"}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Full control</span>
                  <span className="text-xl font-black text-[#111827]">Build Manually</span>
                </span>
                <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-bold text-[#64748B] group-data-[active=true]:border-[var(--business-primary)] group-data-[active=true]:business-text">
                  Editor
                </span>
              </span>
              <span className="text-sm leading-6 text-[#64748B]">Customize every part of your loyalty card from scratch.</span>
              <span className="mt-auto inline-flex w-fit items-center rounded-xl border border-[var(--business-primary)] px-4 py-2 text-sm font-bold business-text transition group-hover:bg-[var(--business-primary-soft)]">
                Start Designing
              </span>
            </button>
          </div>
        </SectionCard>

        <SectionCard title="My Business Presets" description="Save this design for reuse, or apply a saved business preset to this program.">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
              <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                Preset Name
                <input
                  type="text"
                  name="presetName"
                  placeholder="e.g. VIP coffee card"
                  maxLength={80}
                  className="h-11 rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[var(--business-primary)] focus:ring-2 focus:ring-[var(--business-primary)]/20"
                />
              </label>
              <Button formAction={savePresetAction} type="submit" variant="business" className="mt-3 w-full sm:w-fit">
                Save Current Design
              </Button>
            </div>

            {businessPresets.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {businessPresets.map((preset) => (
                  <div key={preset.uuid} className="grid gap-3 rounded-[1.35rem] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                    <PresetThumbnail preset={presetToThumbnailPreset(preset)} />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#111827]">{preset.name}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#94A3B8]">Created {formatPresetDate(preset.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyBusinessPreset(preset)}
                        className="rounded-xl border border-[var(--business-primary)] px-3 py-2 text-sm font-semibold business-text transition hover:bg-[var(--business-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                      >
                        Apply Preset
                      </button>
                      <Button formAction={deletePresetAction} type="submit" name="presetUuid" value={preset.uuid} variant="outline" size="sm">
                        Delete
                      </Button>
                    </div>
                    <div className="grid gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                      <label className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]" htmlFor={`rename-preset-${preset.uuid}`}>
                        Rename preset
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          id={`rename-preset-${preset.uuid}`}
                          type="text"
                          name={`renamePresetName:${preset.uuid}`}
                          defaultValue={preset.name}
                          maxLength={80}
                          className="h-10 min-w-0 flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[var(--business-primary)] focus:ring-2 focus:ring-[var(--business-primary)]/20"
                        />
                        <Button formAction={renamePresetAction} type="submit" name="presetUuid" value={preset.uuid} variant="outline" size="sm">
                          Rename
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-5 text-sm text-[#64748B]">
                No saved business presets yet. Save your current design to reuse it on another loyalty program.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Duplicate From Another Program" description="Copy a design from one of your existing loyalty programs.">
          {sourcePrograms.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {sourcePrograms.map((sourceProgram) => (
                <div key={sourceProgram.uuid} className="grid gap-3 rounded-[1.35rem] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                  <PresetThumbnail preset={sourceProgramToThumbnailPreset(sourceProgram)} />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#111827]">{sourceProgram.name}</p>
                    <p className="mt-1 text-sm leading-6 text-[#64748B]">{designSummary(sourceProgram.cardDesign)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySourceProgramDesign(sourceProgram)}
                    className="w-full rounded-xl border border-[var(--business-primary)] px-3 py-2 text-sm font-semibold business-text transition hover:bg-[var(--business-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 sm:w-fit"
                  >
                    Apply Design
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-5 text-sm text-[#64748B]">
              No other loyalty programs are available yet. Create another program to duplicate its card design here.
            </div>
          )}
        </SectionCard>

        <SectionCard title="Professional Presets" description="Start with a professionally designed loyalty card, then customize every detail.">
          <div className="grid gap-5">
            {designStudioProfessionalPresetGroups.map((group) => (
              <div key={group.category} className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#64748B]">{group.category}</h3>
                  <span className="h-px flex-1 bg-[#E2E8F0]" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.presets.map((preset) => {
                    const active = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyProfessionalPreset(preset)}
                        className="group grid min-h-52 gap-4 rounded-[1.35rem] border border-[#E2E8F0] bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)] data-[active=true]:shadow-lg"
                        data-active={active}
                        aria-pressed={active}
                      >
                        <PresetThumbnail preset={preset} />
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-base font-semibold text-[#111827] group-data-[active=true]:business-text">{preset.name}</span>
                            <span className="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">{preset.category}</span>
                            <span className="mt-2 block text-sm leading-6 text-[#64748B]">{preset.description}</span>
                          </span>
                          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#64748B] opacity-0 transition group-data-[active=true]:border-[var(--business-primary)] group-data-[active=true]:business-bg group-data-[active=true]:opacity-100">
                            Selected
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {manualEditorVisible ? (
          <div className="grid gap-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
            <SectionCard title="Card Style" description="Choose the overall personality of your loyalty card.">
          <div className="grid gap-4 md:grid-cols-2">
            {designStudioTemplateOptions.map((option) => (
              <label key={option.value} className="group cursor-pointer rounded-[1.35rem] border border-[#E2E8F0] bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-lg has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)] has-[:checked]:shadow-lg">
                <input
                  type="radio"
                  name="layoutStyle"
                  value={option.value}
                  checked={layoutStyle === option.value}
                  onChange={() => setLayoutStyle(option.value)}
                  className="sr-only"
                />
                <span className="grid gap-4 rounded-[1.1rem] p-1 focus-within:outline-none group-focus-within:ring-2 group-focus-within:ring-[var(--business-primary)] group-focus-within:ring-offset-2">
                  <TemplateThumbnail value={option.value} />
                  <span className="flex min-h-28 flex-col gap-2 px-1 pb-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="block text-base font-semibold text-[#111827] group-has-[:checked]:business-text">{option.label}</span>
                      <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#64748B] opacity-0 transition group-has-[:checked]:border-[var(--business-primary)] group-has-[:checked]:business-bg group-has-[:checked]:opacity-100">
                        Selected
                      </span>
                    </span>
                    <span className="block text-sm leading-6 text-[#64748B]">{option.description}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
            </SectionCard>
            <SectionCard title="Background" description="Choose the background feeling for this loyalty card.">
          <div className="grid gap-3 md:grid-cols-3">
            {designStudioBackgroundStyleOptions.map((option) => {
              const active = backgroundStyle === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBackgroundStyle(option.value)}
                  className="group grid min-h-28 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)] data-[active=true]:shadow-md"
                  data-active={active}
                  aria-pressed={active}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#111827] group-data-[active=true]:business-text">{option.label}</span>
                    <span className="h-8 w-12 rounded-full border border-[#E2E8F0]" style={{ background: backgroundStylePreview[option.value] }} />
                  </span>
                  <span className="text-xs leading-5 text-[#64748B]">{option.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {designStudioBackgroundPatternOptions.map((option) => {
              const active = backgroundPattern === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setBackgroundPattern(option.value);
                    if (option.value !== "NONE") setBackgroundStyle("PATTERN");
                  }}
                  className="group flex min-h-20 items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)] data-[active=true]:shadow-md"
                  data-active={active}
                  aria-pressed={active}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#64748B]">{patternPreviewLabels[option.value]}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#111827] group-data-[active=true]:business-text">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#64748B]">{option.description}</span>
                  </span>
                </button>
              );
            })}
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

            <SectionCard title="Reward Box" description="Choose how rewards are presented to your customers.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioRewardStyleOptions.map((option) => {
              const active = rewardStyle === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRewardStyle(option.value)}
                  className="group grid min-h-36 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)] data-[active=true]:shadow-md"
                  data-active={active}
                  aria-pressed={active}
                >
                  <RewardStyleThumbnail rewardStyle={option.value} />
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#111827] group-data-[active=true]:business-text">{option.label}</span>
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

            <SectionCard title="Typography" description="Choose the personality of your loyalty card.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioTypographyOptions.map((option) => {
              const active = typographyPreset === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypographyPreset(option.value)}
                  className="group grid min-h-36 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)] data-[active=true]:shadow-md"
                  data-active={active}
                  aria-pressed={active}
                >
                  <TypographyThumbnail typographyPreset={option.value} />
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#111827] group-data-[active=true]:business-text">{option.label}</span>
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

            <SectionCard title="Card Finish" description="Choose the visual finish that best matches your brand.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioCardFinishOptions.map((option) => {
              const active = decorationStyle === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDecorationStyle(option.value)}
                  className="group grid min-h-36 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)] data-[active=true]:shadow-md"
                  data-active={active}
                  aria-pressed={active}
                >
                  <CardFinishThumbnail decorationStyle={option.value} />
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#111827] group-data-[active=true]:business-text">{option.label}</span>
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

            <SectionCard title="Card Content" description="Choose what your customers see on their loyalty card.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioCardContentOptions.map((option) => {
              const active = visibleSections[option.value];
              return (
                <label
                  key={option.value}
                  className="group flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--business-primary)] has-[:focus-visible]:ring-offset-2"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      setVisibleSections((current) => ({
                        ...current,
                        [option.value]: !current[option.value],
                      }))
                    }
                    className="mt-1 h-5 w-5 rounded border-[#CBD5E1] text-[var(--business-primary)] focus:ring-[var(--business-primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#111827] group-has-[:checked]:business-text">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#64748B]">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
            </SectionCard>

            <SectionCard title="Save Design" description="Apply this design to this loyalty program only. Other programs are unchanged." className="shadow-sm">
          <Button type="submit" variant="business" size="lg" className="w-full sm:w-fit">
            Save Design
          </Button>
            </SectionCard>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-5 text-sm leading-6 text-[#64748B]">
            Choose a business or professional preset to reveal the full editor, or select Build Manually to customize every section yourself.
          </div>
        )}
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

function sectionVisibilityMatches(expected: CardSectionVisibility, actual: CardSectionVisibility) {
  return designStudioCardContentOptions.every((option) => expected[option.value] === actual[option.value]);
}

function presetToThumbnailPreset(preset: BusinessDesignPresetOption): DesignStudioProfessionalPreset {
  return {
    id: preset.uuid,
    category: "Business Preset",
    name: preset.name,
    description: "Saved business preset",
    ...preset.cardDesign,
  };
}

function sourceProgramToThumbnailPreset(sourceProgram: SourceProgramDesignOption): DesignStudioProfessionalPreset {
  return {
    id: sourceProgram.uuid,
    category: "Program Design",
    name: sourceProgram.name,
    description: "Existing program design",
    ...sourceProgram.cardDesign,
  };
}

function designSummary(design: DesignStudioPresetDesign) {
  const style = designStudioTemplateOptions.find((option) => option.value === design.layoutStyle)?.label ?? design.layoutStyle;
  const journey = designStudioStampJourneyOptions.find((option) => option.value === design.stampJourneyStyle)?.label ?? design.stampJourneyStyle;
  const finish = designStudioCardFinishOptions.find((option) => option.value === design.decorationStyle)?.label ?? design.decorationStyle;
  return `${style} style, ${journey} progress, ${finish} finish`;
}

function formatPresetDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function PresetThumbnail({ preset }: { preset: DesignStudioProfessionalPreset }) {
  const templateStyle = templateThumbnailStyles[preset.layoutStyle] ?? templateThumbnailStyles.CLASSIC;
  const finishStyle = cardFinishStyles[preset.decorationStyle] ?? cardFinishStyles.FLAT;
  const rewardStyle = rewardBoxStyles[preset.rewardStyle] ?? rewardBoxStyles.FILLED;
  return (
    <span className="block rounded-2xl bg-[#F8FAFC] p-3">
      <span className="block rounded-[1.15rem] border p-3" style={finishStyle.frameStyle}>
        <span className="block overflow-hidden rounded-xl p-3" style={{ ...finishStyle.innerStyle, background: templateStyle.card }}>
          <span className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-black" style={{ background: templateStyle.logo, color: templateStyle.card === "#FFFFFF" ? "#111827" : "#FFFFFF" }}>
                {getStampIconMark(preset.stampIcon)}
              </span>
              <span className="grid gap-1">
                <span className="h-2.5 w-20 rounded-full" style={{ background: templateStyle.primaryLine }} />
                <span className="h-2 w-14 rounded-full" style={{ background: templateStyle.secondaryLine }} />
              </span>
            </span>
            {preset.visibleSections.tierBadge ? <span className="h-6 w-12 rounded-full" style={{ background: templateStyle.badge }} /> : null}
          </span>
          {preset.visibleSections.progress ? (
            <span className="mt-4 block h-3 overflow-hidden rounded-full" style={{ background: templateStyle.track }}>
              <span className="block h-full w-2/3 rounded-full" style={{ background: templateStyle.fill }} />
            </span>
          ) : null}
          {preset.visibleSections.rewardBox ? (
            <span className="mt-4 block rounded-xl border p-3" style={rewardStyle.style}>
              <span className="block h-2 w-16 rounded-full" style={{ background: rewardStyle.mutedColor }} />
              <span className="mt-2 block h-3 w-24 rounded-full" style={{ background: rewardStyle.textColor }} />
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}

function CardFinishPreviewFrame({ children, decorationStyle }: { children: ReactNode; decorationStyle: CardDesignDecorationStyle }) {
  const finish = cardFinishStyles[decorationStyle] ?? cardFinishStyles.FLAT;
  return (
    <div className="mx-auto max-w-[430px] rounded-[2rem] p-3 transition duration-200" style={finish.frameStyle}>
      <div className="rounded-[1.6rem]" style={finish.innerStyle}>
        {children}
      </div>
    </div>
  );
}

function VisibleCardPreview({
  businessName,
  businessLogoUrl,
  customerName,
  memberSince,
  tierLabel,
  tierIcon,
  theme,
  programName,
  rewardName,
  visibleSections,
}: {
  businessName: string;
  businessLogoUrl: string | null;
  customerName: string;
  memberSince: string;
  tierLabel: string;
  tierIcon: string;
  theme: ReturnType<typeof resolveCardThemeColors>;
  programName: string;
  rewardName: string;
  visibleSections: CardSectionVisibility;
}) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] p-6" style={{ background: theme.cardBackground, color: theme.cardText }}>
      <div className="flex items-start justify-between gap-4">
        {(visibleSections.logo || visibleSections.businessName || visibleSections.programName) ? (
          <div className="flex min-w-0 items-start gap-3">
            {visibleSections.logo ? (
              <span
                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-black"
                style={{ background: theme.logoBackground, color: theme.logoText }}
              >
                {businessLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={businessLogoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  businessName.charAt(0).toUpperCase()
                )}
              </span>
            ) : null}
            <div className="min-w-0">
              {visibleSections.businessName ? <p className="line-clamp-2 text-base font-black leading-tight">{businessName}</p> : null}
              {visibleSections.programName ? (
                <p className="mt-1 truncate text-sm font-medium" style={{ color: theme.mutedText }}>
                  {programName}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {visibleSections.tierBadge ? (
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide"
            style={{ background: theme.badgeBackground, color: theme.badgeText, borderColor: theme.badgeBorder }}
          >
            {tierIcon} {tierLabel}
          </span>
        ) : null}
      </div>

      {visibleSections.customerName ? (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: theme.mutedText }}>
            Customer
          </p>
          <p className="mt-2 text-3xl font-black leading-tight">{customerName}</p>
          <p className="mt-2 text-sm" style={{ color: theme.mutedText }}>
            Member since {memberSince}
          </p>
        </div>
      ) : null}

      {visibleSections.progress ? (
        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: theme.mutedText }}>
                Progress
              </p>
              <p className="mt-2 text-4xl font-black">7/10</p>
            </div>
            {visibleSections.visits ? <p className="text-right text-sm font-bold">3 visits remaining</p> : null}
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full" style={{ background: theme.progressTrack }}>
            <div className="h-full w-[70%] rounded-full" style={{ background: theme.progressFill }} />
          </div>
        </div>
      ) : null}

      {visibleSections.rewardBox ? (
        <div className="mt-6 rounded-3xl border p-4" style={{ background: theme.rewardPanelBackground, color: theme.rewardPanelText, borderColor: theme.rewardPanelBorder }}>
          <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: theme.rewardPanelMuted }}>
            Next reward
          </p>
          <p className="mt-2 text-xl font-black">{rewardName}</p>
        </div>
      ) : null}

      {visibleSections.qr ? (
        <div className="mt-6 rounded-3xl p-4" style={{ background: theme.qrSurface, color: "#111827" }}>
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 shrink-0 grid-cols-3 grid-rows-3 gap-1 rounded-2xl bg-white p-3 ring-1 ring-black/10">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} className={index % 2 === 0 ? "rounded-sm bg-[#111827]" : "rounded-sm bg-[#E5E7EB]"} />
              ))}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">Scan at Checkout</span>
              <span className="mt-1 block text-xs text-[#64748B]">Present this QR to staff.</span>
            </span>
          </div>
        </div>
      ) : null}

      {visibleSections.referral ? (
        <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold">
          Refer a friend and share this loyalty card.
        </div>
      ) : null}

      {visibleSections.footer ? (
        <div className="mt-6 rounded-full px-5 py-3 text-center text-sm font-black" style={{ background: theme.ctaBackground, color: theme.ctaForeground }}>
          Scan at Checkout
        </div>
      ) : null}
    </div>
  );
}

function CardFinishThumbnail({ decorationStyle }: { decorationStyle: CardDesignDecorationStyle }) {
  const finish = cardFinishStyles[decorationStyle] ?? cardFinishStyles.FLAT;
  return (
    <span className="block rounded-2xl bg-[#F8FAFC] p-3">
      <span className="block rounded-[1.15rem] border p-3" style={finish.frameStyle}>
        <span className="block rounded-xl p-3" style={finish.innerStyle}>
          <span className="flex items-center justify-between gap-3">
            <span className="h-7 w-7 rounded-full business-bg" />
            <span className="h-5 w-16 rounded-full bg-[#E2E8F0]" />
          </span>
          <span className="mt-4 block h-3 rounded-full bg-[#CBD5E1]" />
          <span className="mt-3 grid grid-cols-3 gap-2">
            <span className="h-8 rounded-xl bg-white/80" />
            <span className="h-8 rounded-xl bg-white/80" />
            <span className="h-8 rounded-xl bg-white/80" />
          </span>
        </span>
      </span>
    </span>
  );
}

function TypographyCardPreview({
  businessName,
  customerName,
  progress,
  rewardName,
  typographyPreset,
}: {
  businessName: string;
  customerName: string;
  progress: string;
  rewardName: string;
  typographyPreset: CardDesignTypographyPreset;
}) {
  const style = typographyPreviewStyles[typographyPreset] ?? typographyPreviewStyles.MODERN;
  return (
    <div className="mb-5 rounded-3xl border border-[#E5E7EB] bg-white/90 p-4 shadow-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#94A3B8]">Typography Preview</p>
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={style.businessClass}>{businessName}</p>
            <p className={style.customerClass}>{customerName}</p>
          </div>
          <p className={style.progressClass}>{progress}</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className={style.captionClass}>Next reward</p>
          <p className={style.rewardClass}>{rewardName}</p>
        </div>
      </div>
    </div>
  );
}

function TypographyThumbnail({ typographyPreset }: { typographyPreset: CardDesignTypographyPreset }) {
  const style = typographyPreviewStyles[typographyPreset] ?? typographyPreviewStyles.MODERN;
  return (
    <span className="block rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <span className={style.thumbnailHeading}>Loyalty Card</span>
      <span className={style.thumbnailCustomer}>Mina Hanna</span>
      <span className="mt-3 flex items-end justify-between gap-3">
        <span className={style.thumbnailReward}>Free Coffee</span>
        <span className={style.thumbnailProgress}>7/10</span>
      </span>
    </span>
  );
}

function RewardBoxPreview({ rewardName, rewardStyle }: { rewardName: string; rewardStyle: CardDesignRewardStyle }) {
  const style = rewardBoxStyles[rewardStyle] ?? rewardBoxStyles.FILLED;
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#94A3B8]">Reward Box</p>
      <div className={`relative overflow-hidden rounded-3xl border p-4 ${style.className}`} style={style.style}>
        {rewardStyle === "TICKET" ? (
          <>
            <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" />
            <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" />
          </>
        ) : null}
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: style.mutedColor }}>
              Next reward
            </p>
            <p className="mt-1 text-lg font-black leading-tight" style={{ color: style.textColor }}>
              {rewardName}
            </p>
          </div>
          <span className="shrink-0 rounded-full px-3 py-1 text-xs font-black" style={{ background: style.badgeBackground, color: style.badgeColor }}>
            3 visits
          </span>
        </div>
      </div>
    </div>
  );
}

function RewardStyleThumbnail({ rewardStyle }: { rewardStyle: CardDesignRewardStyle }) {
  const style = rewardBoxStyles[rewardStyle] ?? rewardBoxStyles.FILLED;
  return (
    <span className={`relative block overflow-hidden rounded-2xl border p-3 ${style.className}`} style={style.style}>
      {rewardStyle === "TICKET" ? (
        <>
          <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
        </>
      ) : null}
      <span className="relative grid gap-2">
        <span className="h-2 w-20 rounded-full" style={{ background: style.mutedColor }} />
        <span className="h-3 w-28 rounded-full" style={{ background: style.textColor }} />
        <span className="mt-1 h-5 w-16 rounded-full" style={{ background: style.badgeBackground }} />
      </span>
    </span>
  );
}

function CardProgressPreview({
  journeyStyle,
  stampIcon,
  stampIconLabel,
}: {
  journeyStyle: CardDesignStampJourneyStyle;
  stampIcon: CardDesignStampIcon;
  stampIconLabel: string;
}) {
  return (
    <div className="mt-5 rounded-3xl border border-[#E5E7EB] bg-white/90 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#94A3B8]">Reward Progress</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{journeyStyleLabel[journeyStyle] ?? "Circles"}</p>
        </div>
        <StampIconPreview stampIcon={stampIcon} label={stampIconLabel} />
      </div>
      {journeyStyle === "PROGRESS_BAR" ? (
        <ProgressBarJourneyPreview stampIcon={stampIcon} />
      ) : journeyStyle === "CONNECTED_DOTS" ? (
        <ConnectedDotsJourneyPreview stampIcon={stampIcon} />
      ) : (
        <CircleJourneyPreview stampIcon={stampIcon} />
      )}
    </div>
  );
}

function CircleJourneyPreview({ stampIcon }: { stampIcon: CardDesignStampIcon }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 10 }).map((_, index) => {
        const earned = index < 7;
        return (
          <span
            key={index}
            className="grid aspect-square min-h-10 place-items-center rounded-full border text-xs font-black transition"
            style={{
              background: earned ? "var(--business-primary)" : "#F8FAFC",
              borderColor: earned ? "var(--business-primary)" : "#E2E8F0",
              color: earned ? "var(--business-primary-foreground)" : "#94A3B8",
            }}
          >
            {earned ? getStampIconMark(stampIcon) : index + 1}
          </span>
        );
      })}
    </div>
  );
}

function ConnectedDotsJourneyPreview({ stampIcon }: { stampIcon: CardDesignStampIcon }) {
  return (
    <div className="relative grid grid-cols-5 gap-x-3 gap-y-4 py-2">
      <span className="absolute left-5 right-5 top-7 hidden h-0.5 bg-[#E2E8F0] sm:block" />
      <span className="absolute left-5 top-7 hidden h-0.5 w-[62%] bg-[var(--business-primary)] sm:block" />
      {Array.from({ length: 10 }).map((_, index) => {
        const earned = index < 7;
        return (
          <span key={index} className="relative z-10 grid place-items-center gap-1">
            <span
              className="grid h-10 w-10 place-items-center rounded-full border text-xs font-black shadow-sm"
              style={{
                background: earned ? "var(--business-primary)" : "#FFFFFF",
                borderColor: earned ? "var(--business-primary)" : "#CBD5E1",
                color: earned ? "var(--business-primary-foreground)" : "#94A3B8",
              }}
            >
              {earned ? getStampIconMark(stampIcon) : index + 1}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function ProgressBarJourneyPreview({ stampIcon }: { stampIcon: CardDesignStampIcon }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <span className="text-3xl font-black text-[#111827]">7/10</span>
        <span className="text-sm font-semibold business-text">3 visits remaining</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div className="flex h-full w-[70%] items-center justify-end rounded-full business-bg pr-2">
          <span className="text-[10px] font-black leading-none">{getStampIconMark(stampIcon)}</span>
        </div>
      </div>
    </div>
  );
}

function StampIconPreview({ stampIcon, label }: { stampIcon: CardDesignStampIcon; label: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--business-primary)] bg-[var(--business-primary-soft)] px-3 py-2">
      <span className="grid h-8 w-8 place-items-center rounded-full business-bg text-xs font-black">{getStampIconMark(stampIcon)}</span>
      <span className="max-w-24 truncate text-xs font-semibold text-[#111827]">{label}</span>
    </div>
  );
}

function TemplateThumbnail({ value }: { value: CardDesignLayoutStyle }) {
  const style = templateThumbnailStyles[value] ?? templateThumbnailStyles.CLASSIC;
  return (
    <span className="relative block overflow-hidden rounded-[1.1rem] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <span className="absolute right-3 top-3 h-12 w-12 rounded-full opacity-20" style={{ background: style.accent }} />
      <span className="relative block rounded-xl p-3 shadow-sm ring-1 ring-black/5" style={{ background: style.card }}>
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full" style={{ background: style.logo }} />
            <span className="grid gap-1">
              <span className="h-2.5 w-20 rounded-full" style={{ background: style.primaryLine }} />
              <span className="h-2 w-14 rounded-full" style={{ background: style.secondaryLine }} />
            </span>
          </span>
          <span className="h-6 w-12 rounded-full" style={{ background: style.badge }} />
        </span>
        <span className="mt-5 block h-3 overflow-hidden rounded-full" style={{ background: style.track }}>
          <span className="block h-full w-2/3 rounded-full" style={{ background: style.fill }} />
        </span>
        <span className="mt-4 grid grid-cols-3 gap-2">
          <span className="h-10 rounded-xl" style={{ background: style.panel }} />
          <span className="h-10 rounded-xl" style={{ background: style.panel }} />
          <span className="h-10 rounded-xl" style={{ background: style.panel }} />
        </span>
      </span>
    </span>
  );
}

const templateThumbnailStyles: Record<CardDesignLayoutStyle, {
  card: string;
  logo: string;
  primaryLine: string;
  secondaryLine: string;
  badge: string;
  track: string;
  fill: string;
  panel: string;
  accent: string;
}> = {
  CLASSIC: {
    card: "linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%)",
    logo: "#F97316",
    primaryLine: "#111827",
    secondaryLine: "#FDBA74",
    badge: "#FED7AA",
    track: "#FFEDD5",
    fill: "linear-gradient(90deg, #F97316, #FB923C)",
    panel: "#FFFFFF",
    accent: "#F97316",
  },
  MODERN: {
    card: "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)",
    logo: "#0F172A",
    primaryLine: "#0F172A",
    secondaryLine: "#94A3B8",
    badge: "#E2E8F0",
    track: "#E2E8F0",
    fill: "linear-gradient(90deg, #0F172A, #475569)",
    panel: "#EEF2F7",
    accent: "#475569",
  },
  MINIMAL: {
    card: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
    logo: "#111827",
    primaryLine: "#111827",
    secondaryLine: "#CBD5E1",
    badge: "#F1F5F9",
    track: "#E2E8F0",
    fill: "linear-gradient(90deg, #111827, #334155)",
    panel: "#F8FAFC",
    accent: "#111827",
  },
  PREMIUM: {
    card: "linear-gradient(135deg, #111827 0%, #312E81 100%)",
    logo: "#F97316",
    primaryLine: "#FFFFFF",
    secondaryLine: "rgba(255,255,255,0.45)",
    badge: "rgba(249,115,22,0.45)",
    track: "rgba(255,255,255,0.18)",
    fill: "linear-gradient(90deg, #F97316, #FDBA74)",
    panel: "rgba(255,255,255,0.14)",
    accent: "#F97316",
  },
  LUXURY: {
    card: "linear-gradient(135deg, #18181B 0%, #3F2F22 100%)",
    logo: "#E9C18D",
    primaryLine: "#F8FAFC",
    secondaryLine: "rgba(233,193,141,0.6)",
    badge: "rgba(233,193,141,0.28)",
    track: "rgba(255,255,255,0.16)",
    fill: "linear-gradient(90deg, #E9C18D, #FDE68A)",
    panel: "rgba(255,255,255,0.12)",
    accent: "#E9C18D",
  },
};

const cardFinishStyles: Record<CardDesignDecorationStyle, {
  frameStyle: {
    background?: string;
    backgroundColor?: string;
    border?: string;
    boxShadow?: string;
    backdropFilter?: string;
  };
  innerStyle: {
    border?: string;
    boxShadow?: string;
    overflow?: "hidden";
  };
}> = {
  FLAT: {
    frameStyle: {
      backgroundColor: "#FFFFFF",
      border: "1px solid #E2E8F0",
      boxShadow: "none",
    },
    innerStyle: {
      border: "1px solid transparent",
      boxShadow: "none",
      overflow: "hidden",
    },
  },
  SOFT: {
    frameStyle: {
      backgroundColor: "#FFFFFF",
      border: "1px solid #E2E8F0",
      boxShadow: "0 18px 44px rgba(15, 23, 42, 0.12)",
    },
    innerStyle: {
      border: "1px solid rgba(226, 232, 240, 0.7)",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
      overflow: "hidden",
    },
  },
  GLASS: {
    frameStyle: {
      background: "linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.36))",
      border: "1px solid rgba(255,255,255,0.72)",
      boxShadow: "0 22px 52px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.75)",
      backdropFilter: "blur(10px)",
    },
    innerStyle: {
      border: "1px solid rgba(255,255,255,0.62)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
      overflow: "hidden",
    },
  },
  PREMIUM: {
    frameStyle: {
      background: "linear-gradient(135deg, rgba(249,115,22,0.26), rgba(15,23,42,0.08))",
      border: "1px solid rgba(249,115,22,0.42)",
      boxShadow: "0 26px 64px rgba(15, 23, 42, 0.22)",
    },
    innerStyle: {
      border: "1px solid rgba(249,115,22,0.32)",
      boxShadow: "0 14px 34px rgba(15, 23, 42, 0.16)",
      overflow: "hidden",
    },
  },
  LUXURY: {
    frameStyle: {
      background: "linear-gradient(135deg, rgba(233,193,141,0.36), rgba(24,24,27,0.12))",
      border: "1px solid rgba(233,193,141,0.58)",
      boxShadow: "0 28px 70px rgba(24, 24, 27, 0.24)",
    },
    innerStyle: {
      border: "1px solid rgba(233,193,141,0.42)",
      boxShadow: "0 16px 40px rgba(24, 24, 27, 0.18)",
      overflow: "hidden",
    },
  },
};

const rewardBoxStyles: Record<CardDesignRewardStyle, {
  className: string;
  style: {
    background?: string;
    backgroundColor?: string;
    borderColor: string;
    boxShadow?: string;
  };
  textColor: string;
  mutedColor: string;
  badgeBackground: string;
  badgeColor: string;
}> = {
  FILLED: {
    className: "",
    style: {
      background: "var(--business-primary)",
      borderColor: "var(--business-primary)",
      boxShadow: "0 18px 38px rgba(15, 23, 42, 0.14)",
    },
    textColor: "var(--business-primary-foreground)",
    mutedColor: "var(--business-primary-foreground)",
    badgeBackground: "rgba(255,255,255,0.22)",
    badgeColor: "var(--business-primary-foreground)",
  },
  OUTLINE: {
    className: "bg-white",
    style: {
      borderColor: "var(--business-primary)",
    },
    textColor: "#111827",
    mutedColor: "var(--business-primary)",
    badgeBackground: "var(--business-primary-soft)",
    badgeColor: "var(--business-primary)",
  },
  GLASS: {
    className: "bg-white/70",
    style: {
      borderColor: "rgba(255,255,255,0.72)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72), 0 18px 38px rgba(15, 23, 42, 0.10)",
    },
    textColor: "#111827",
    mutedColor: "#64748B",
    badgeBackground: "rgba(255,255,255,0.78)",
    badgeColor: "#111827",
  },
  PREMIUM: {
    className: "",
    style: {
      background: "linear-gradient(135deg, #111827 0%, #312E81 100%)",
      borderColor: "rgba(249,115,22,0.48)",
      boxShadow: "0 20px 42px rgba(17, 24, 39, 0.22)",
    },
    textColor: "#FFFFFF",
    mutedColor: "#FDBA74",
    badgeBackground: "rgba(249,115,22,0.22)",
    badgeColor: "#FDBA74",
  },
  TICKET: {
    className: "bg-white",
    style: {
      borderColor: "var(--business-primary)",
      boxShadow: "0 14px 30px rgba(15, 23, 42, 0.10)",
    },
    textColor: "#111827",
    mutedColor: "var(--business-primary)",
    badgeBackground: "var(--business-primary)",
    badgeColor: "var(--business-primary-foreground)",
  },
};

const typographyPreviewStyles: Record<CardDesignTypographyPreset, {
  businessClass: string;
  customerClass: string;
  progressClass: string;
  captionClass: string;
  rewardClass: string;
  thumbnailHeading: string;
  thumbnailCustomer: string;
  thumbnailReward: string;
  thumbnailProgress: string;
}> = {
  MODERN: {
    businessClass: "truncate text-sm font-semibold tracking-normal text-[#475569]",
    customerClass: "mt-1 truncate text-2xl font-extrabold leading-tight tracking-[-0.03em] text-[#111827]",
    progressClass: "text-right text-2xl font-black tracking-[-0.04em] text-[#111827]",
    captionClass: "text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748B]",
    rewardClass: "mt-1 text-lg font-extrabold tracking-[-0.02em] text-[#111827]",
    thumbnailHeading: "block text-xs font-semibold tracking-normal text-[#64748B]",
    thumbnailCustomer: "mt-1 block text-lg font-extrabold tracking-[-0.03em] text-[#111827]",
    thumbnailReward: "text-sm font-bold text-[#111827]",
    thumbnailProgress: "text-lg font-black text-[#111827]",
  },
  CLASSIC: {
    businessClass: "truncate text-sm font-medium tracking-wide text-[#475569]",
    customerClass: "mt-1 truncate text-2xl font-bold leading-tight tracking-normal text-[#111827]",
    progressClass: "text-right text-2xl font-bold tracking-normal text-[#111827]",
    captionClass: "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]",
    rewardClass: "mt-1 text-lg font-bold tracking-normal text-[#111827]",
    thumbnailHeading: "block text-xs font-medium tracking-wide text-[#64748B]",
    thumbnailCustomer: "mt-1 block text-lg font-bold tracking-normal text-[#111827]",
    thumbnailReward: "text-sm font-semibold text-[#111827]",
    thumbnailProgress: "text-lg font-bold text-[#111827]",
  },
  PREMIUM: {
    businessClass: "truncate text-xs font-black uppercase tracking-[0.2em] text-[#475569]",
    customerClass: "mt-1 truncate text-3xl font-black leading-none tracking-[-0.06em] text-[#111827]",
    progressClass: "text-right text-3xl font-black tracking-[-0.06em] text-[#111827]",
    captionClass: "text-[11px] font-black uppercase tracking-[0.22em] business-text",
    rewardClass: "mt-1 text-xl font-black tracking-[-0.04em] text-[#111827]",
    thumbnailHeading: "block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B]",
    thumbnailCustomer: "mt-1 block text-xl font-black tracking-[-0.06em] text-[#111827]",
    thumbnailReward: "text-sm font-black text-[#111827]",
    thumbnailProgress: "text-xl font-black text-[#111827]",
  },
  LUXURY: {
    businessClass: "truncate text-xs font-semibold uppercase tracking-[0.28em] text-[#64748B]",
    customerClass: "mt-1 truncate text-2xl font-semibold leading-tight tracking-[0.02em] text-[#111827]",
    progressClass: "text-right text-2xl font-semibold tracking-[0.04em] text-[#111827]",
    captionClass: "text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8B6F47]",
    rewardClass: "mt-1 text-lg font-semibold tracking-[0.03em] text-[#111827]",
    thumbnailHeading: "block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#64748B]",
    thumbnailCustomer: "mt-1 block text-lg font-semibold tracking-[0.03em] text-[#111827]",
    thumbnailReward: "text-sm font-semibold tracking-[0.03em] text-[#111827]",
    thumbnailProgress: "text-lg font-semibold tracking-[0.04em] text-[#111827]",
  },
  PLAYFUL: {
    businessClass: "truncate text-sm font-bold tracking-wide text-[#475569]",
    customerClass: "mt-1 truncate text-2xl font-black leading-tight tracking-normal text-[#111827]",
    progressClass: "text-right text-2xl font-black tracking-normal business-text",
    captionClass: "text-[11px] font-black uppercase tracking-[0.12em] text-[#64748B]",
    rewardClass: "mt-1 text-lg font-black tracking-normal text-[#111827]",
    thumbnailHeading: "block text-xs font-bold tracking-wide text-[#64748B]",
    thumbnailCustomer: "mt-1 block text-lg font-black tracking-normal text-[#111827]",
    thumbnailReward: "text-sm font-black text-[#111827]",
    thumbnailProgress: "text-lg font-black business-text",
  },
  MINIMAL: {
    businessClass: "truncate text-sm font-normal tracking-wide text-[#64748B]",
    customerClass: "mt-1 truncate text-2xl font-light leading-tight tracking-[0.01em] text-[#111827]",
    progressClass: "text-right text-2xl font-light tracking-[0.02em] text-[#111827]",
    captionClass: "text-[11px] font-medium uppercase tracking-[0.2em] text-[#94A3B8]",
    rewardClass: "mt-1 text-lg font-light tracking-[0.01em] text-[#111827]",
    thumbnailHeading: "block text-xs font-normal tracking-wide text-[#64748B]",
    thumbnailCustomer: "mt-1 block text-lg font-light tracking-[0.01em] text-[#111827]",
    thumbnailReward: "text-sm font-light text-[#111827]",
    thumbnailProgress: "text-lg font-light text-[#111827]",
  },
};

const backgroundStylePreview: Record<"SOLID" | "GRADIENT" | "PATTERN", string> = {
  SOLID: "#F8FAFC",
  GRADIENT: "linear-gradient(135deg, #FFFFFF 0%, #FDBA74 100%)",
  PATTERN: "radial-gradient(circle at 4px 4px, #CBD5E1 1.5px, transparent 1.5px), #F8FAFC",
};

const patternPreviewLabels: Record<CardDesignBackgroundPattern, string> = {
  NONE: "-",
  SUBTLE_DOTS: "DOT",
  DIAGONAL_LINES: "///",
  WAVES: "~~~",
  COFFEE_BEANS: "CAF",
  SCISSORS: "CUT",
  WATER_BUBBLES: "H2O",
  FOOD_PATTERN: "DINE",
  BEAUTY_PATTERN: "SPA",
};

const journeyStyleLabel: Partial<Record<CardDesignStampJourneyStyle, string>> = {
  CIRCLES: "Circles",
  CONNECTED_DOTS: "Connected Dots",
  PROGRESS_BAR: "Progress Bar",
};

const stampIconMarks: Record<CardDesignStampIcon, string> = {
  STAR: "*",
  HEART: "HT",
  CHECK: "OK",
  CIRCLE: "O",
  DIAMOND: "DI",
  GIFT: "GF",
  SCISSORS: "SC",
  RAZOR: "RZ",
  COMB: "CB",
  BARBER_POLE: "BP",
  COFFEE_CUP: "CC",
  COFFEE_BEAN: "CBN",
  ESPRESSO: "ESP",
  PLATE: "PL",
  BURGER: "BG",
  PIZZA: "PZ",
  CHEF_HAT: "CH",
  CAR: "CAR",
  WATER_DROP: "H2O",
  BUBBLES: "BUB",
  WHEEL: "WH",
  LIPSTICK: "LIP",
  MIRROR: "MIR",
  MAKEUP_BRUSH: "MB",
  NAIL_POLISH: "NP",
};

function getStampIconMark(stampIcon: CardDesignStampIcon) {
  return stampIconMarks[stampIcon] ?? "*";
}
