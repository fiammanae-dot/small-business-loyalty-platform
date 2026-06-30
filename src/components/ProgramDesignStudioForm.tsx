"use client";

import { useMemo, useState } from "react";
import type { CardDesignBackgroundPattern, CardDesignBackgroundStyle, CardDesignLayoutStyle, CardDesignStampIcon, CardDesignStampJourneyStyle } from "@/lib/card-design";
import { getCardThemeForLayoutStyle, getCardStyleForLayoutStyle, resolveCardDesign } from "@/lib/card-design";
import { resolveCardThemeColors } from "@/lib/card-themes";
import {
  designStudioBackgroundPatternOptions,
  designStudioBackgroundStyleOptions,
  designStudioIndustryStyleOptions,
  designStudioStampJourneyOptions,
  designStudioTemplateOptions,
} from "@/lib/design-studio";
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
    backgroundStyle: CardDesignBackgroundStyle;
    backgroundPattern: CardDesignBackgroundPattern;
  };
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
  const cardDesign = useMemo(
    () =>
      resolveCardDesign({
        layoutStyle,
        cardStyle: getCardStyleForLayoutStyle(layoutStyle),
        stampJourneyStyle,
        stampIcon,
        backgroundStyle,
        backgroundPattern,
      }),
    [backgroundPattern, backgroundStyle, layoutStyle, stampJourneyStyle, stampIcon],
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
  const activeIndustryStyleId =
    designStudioIndustryStyleOptions.find(
      (option) => option.layoutStyle === layoutStyle && option.stampJourneyStyle === stampJourneyStyle && option.stampIcon === stampIcon,
    )?.id ?? null;

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)] xl:items-start">
      <input type="hidden" name={csrfName} value={csrfToken} />
      <input type="hidden" name="programUuid" value={programUuid} />
      <input type="hidden" name="backgroundStyle" value={backgroundStyle} />
      <input type="hidden" name="backgroundPattern" value={backgroundPattern} />

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
          <CardProgressPreview journeyStyle={stampJourneyStyle} stampIcon={stampIcon} stampIconLabel={selectedIconLabel} />
          <div className="mt-5 grid gap-2 rounded-2xl border border-[#E5E7EB] bg-white/85 p-4 text-sm shadow-sm">
            <PreviewLine label="Card Style" value={selectedStyleLabel} />
            <PreviewLine label="Reward Progress" value={selectedJourneyLabel} />
            <PreviewLine label="Stamp Design" value={selectedIconLabel} />
            <PreviewLine label="Background" value={`${selectedBackgroundLabel} / ${selectedPatternLabel}`} />
          </div>
        </SectionCard>
      </aside>

      <div className="order-last grid gap-5 xl:order-first">
        <SectionCard title="Industry Style" description="Start with a style made for your type of business.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioIndustryStyleOptions.map((option) => {
              const active = activeIndustryStyleId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setLayoutStyle(option.layoutStyle);
                    setStampJourneyStyle(option.stampJourneyStyle);
                    setStampIcon(option.stampIcon);
                  }}
                  className="group grid min-h-44 gap-4 rounded-[1.35rem] border border-[#E2E8F0] bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-[var(--business-primary-soft)] data-[active=true]:shadow-lg"
                  data-active={active}
                  aria-pressed={active}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-[#111827] group-data-[active=true]:business-text">{option.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#64748B]">{option.description}</span>
                    </span>
                    <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#64748B] opacity-0 transition group-data-[active=true]:border-[var(--business-primary)] group-data-[active=true]:business-bg group-data-[active=true]:opacity-100">
                      Active
                    </span>
                  </span>
                  <span className="grid gap-2 rounded-2xl border border-[#E2E8F0] bg-white/80 p-3 text-xs text-[#64748B]">
                    <span className="flex items-center justify-between gap-3">
                      <span>Stamp design</span>
                      <span className="font-semibold text-[#111827]">{option.stampIconLabel}</span>
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      <span>Style personality</span>
                      <span className="font-semibold text-[#111827]">{option.stylePersonality}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>
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
