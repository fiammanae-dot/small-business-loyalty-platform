"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
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

type DesignHistorySnapshot = DesignStudioPresetDesign;
type DesignStartMode = "template" | "manual" | "duplicate";
type PreviewContext = "phone" | "apple-wallet" | "google-wallet";
type PreviewZoom = "fit" | "75" | "100" | "125";
type ProfessionalPresetCategory = "All" | DesignStudioProfessionalPreset["category"];

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
  const [designStartMode, setDesignStartMode] = useState<DesignStartMode>("template");
  const [presetApplied, setPresetApplied] = useState(false);
  const [previewContext, setPreviewContext] = useState<PreviewContext>("phone");
  const [previewZoom, setPreviewZoom] = useState<PreviewZoom>("fit");
  const [professionalPresetCategory, setProfessionalPresetCategory] = useState<ProfessionalPresetCategory>("All");
  const [professionalPresetSearch, setProfessionalPresetSearch] = useState("");
  const [copiedSourceProgramUuid, setCopiedSourceProgramUuid] = useState<string | null>(null);
  const [previewActionMessage, setPreviewActionMessage] = useState("");
  const [previewActionPending, setPreviewActionPending] = useState<"png" | "pdf" | "link" | null>(null);
  const [designHistoryPast, setDesignHistoryPast] = useState<DesignHistorySnapshot[]>([]);
  const [designHistoryFuture, setDesignHistoryFuture] = useState<DesignHistorySnapshot[]>([]);
  const previewExportRef = useRef<HTMLDivElement | null>(null);
  const currentDesignSnapshot = useMemo<DesignHistorySnapshot>(
    () => ({
      layoutStyle,
      stampJourneyStyle,
      stampIcon,
      backgroundStyle,
      backgroundPattern,
      rewardStyle,
      typographyPreset,
      decorationStyle,
      visibleSections: { ...visibleSections },
    }),
    [backgroundPattern, backgroundStyle, decorationStyle, layoutStyle, rewardStyle, stampJourneyStyle, stampIcon, typographyPreset, visibleSections],
  );
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
  const selectedJourneyLabel = designStudioStampJourneyOptions.find((option) => option.value === stampJourneyStyle)?.label ?? stampJourneyStyle;
  const selectedStyleLabel = designStudioTemplateOptions.find((option) => option.value === layoutStyle)?.label ?? layoutStyle;
  const selectedTypographyLabel = designStudioTypographyOptions.find((option) => option.value === typographyPreset)?.label ?? typographyPreset;
  const selectedPreviewContextLabel = previewContextOptions.find((option) => option.value === previewContext)?.label ?? "Phone";
  const selectedStampIconLabel = stampIconOptions.find((option) => option.value === stampIcon)?.label ?? labelizeLocal(stampIcon);
  const selectedBackgroundLabel = designStudioBackgroundStyleOptions.find((option) => option.value === backgroundStyle)?.label ?? backgroundStyle;
  const selectedPatternLabel = designStudioBackgroundPatternOptions.find((option) => option.value === backgroundPattern)?.label ?? labelizeLocal(backgroundPattern);
  const selectedFinishLabel = designStudioCardFinishOptions.find((option) => option.value === decorationStyle)?.label ?? decorationStyle;
  const visibleSectionCount = designStudioCardContentOptions.filter((option) => visibleSections[option.value]).length;
  const activeProfessionalPreset =
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
    ) ?? null;
  const activePresetId = activeProfessionalPreset?.id ?? null;
  const manualEditorVisible = designStartMode === "manual" || presetApplied;
  const professionalTemplatesVisible = designStartMode === "template" && !presetApplied;
  const businessPresetsVisible = designStartMode === "template";
  const duplicateDesignVisible = designStartMode === "duplicate";
  const normalizedPresetSearch = professionalPresetSearch.trim().toLowerCase();
  const filteredProfessionalPresets = useMemo(
    () =>
      designStudioProfessionalPresetGroups
        .filter((group) => professionalPresetCategory === "All" || group.category === professionalPresetCategory)
        .flatMap((group) =>
          group.presets.filter((preset) => {
            if (!normalizedPresetSearch) return true;
            const searchable = `${preset.name} ${preset.category} ${preset.description}`.toLowerCase();
            return searchable.includes(normalizedPresetSearch);
          }),
        ),
    [normalizedPresetSearch, professionalPresetCategory],
  );
  const selectedProfessionalCategoryLabel = professionalPresetCategoryOptions.find((option) => option.value === professionalPresetCategory)?.label ?? professionalPresetCategory;
  const canUndoDesign = designHistoryPast.length > 0;
  const canRedoDesign = designHistoryFuture.length > 0;

  const applyDesignSnapshot = useCallback((snapshot: DesignHistorySnapshot) => {
    setLayoutStyle(snapshot.layoutStyle);
    setBackgroundStyle(snapshot.backgroundStyle);
    setBackgroundPattern(snapshot.backgroundPattern);
    setStampJourneyStyle(snapshot.stampJourneyStyle);
    setStampIcon(snapshot.stampIcon);
    setRewardStyle(snapshot.rewardStyle);
    setTypographyPreset(snapshot.typographyPreset);
    setDecorationStyle(snapshot.decorationStyle);
    setVisibleSections({ ...snapshot.visibleSections });
  }, []);

  const commitDesignChange = useCallback(
    (nextSnapshot: DesignHistorySnapshot) => {
      if (designSnapshotsMatch(currentDesignSnapshot, nextSnapshot)) return;
      setDesignHistoryPast((past) => [...past, cloneDesignSnapshot(currentDesignSnapshot)].slice(-50));
      setDesignHistoryFuture([]);
      applyDesignSnapshot(nextSnapshot);
    },
    [applyDesignSnapshot, currentDesignSnapshot],
  );

  const undoDesignChange = useCallback(() => {
    setDesignHistoryPast((past) => {
      const previous = past[past.length - 1];
      if (!previous) return past;
      setDesignHistoryFuture((future) => [cloneDesignSnapshot(currentDesignSnapshot), ...future].slice(0, 50));
      applyDesignSnapshot(previous);
      return past.slice(0, -1);
    });
  }, [applyDesignSnapshot, currentDesignSnapshot]);

  const redoDesignChange = useCallback(() => {
    setDesignHistoryFuture((future) => {
      const next = future[0];
      if (!next) return future;
      setDesignHistoryPast((past) => [...past, cloneDesignSnapshot(currentDesignSnapshot)].slice(-50));
      applyDesignSnapshot(next);
      return future.slice(1);
    });
  }, [applyDesignSnapshot, currentDesignSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (isEditableKeyboardTarget(target)) return;
      const modifierPressed = event.ctrlKey || event.metaKey;
      if (!modifierPressed) return;

      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redoDesignChange();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        undoDesignChange();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        redoDesignChange();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redoDesignChange, undoDesignChange]);

  const applyProfessionalPreset = (preset: DesignStudioProfessionalPreset) => {
    commitDesignChange(presetToDesignSnapshot(preset));
    setPresetApplied(true);
    setCopiedSourceProgramUuid(null);
  };

  const applyBusinessPreset = (preset: BusinessDesignPresetOption) => {
    commitDesignChange(preset.cardDesign);
    setPresetApplied(true);
    setCopiedSourceProgramUuid(null);
  };

  const applySourceProgramDesign = (sourceProgram: SourceProgramDesignOption) => {
    commitDesignChange(sourceProgram.cardDesign);
    setCopiedSourceProgramUuid(sourceProgram.uuid);
    setPresetApplied(true);
  };

  const capturePreviewPng = async () => {
    if (!previewExportRef.current) {
      throw new Error("Preview is not available yet.");
    }

    return toPng(previewExportRef.current, {
      cacheBust: true,
      pixelRatio: Math.max(2, Math.min(window.devicePixelRatio || 2, 3)),
      backgroundColor: "#ffffff",
      includeQueryParams: true,
      style: {
        transform: "none",
        transformOrigin: "top left",
      },
    });
  };

  const downloadPreviewPng = async () => {
    setPreviewActionPending("png");
    setPreviewActionMessage("");
    try {
      const dataUrl = await capturePreviewPng();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `loyalty-card-design-preview-${filenameSafeLocal(programName)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPreviewActionMessage("PNG downloaded.");
    } catch (error) {
      console.error("Design preview PNG export failed", error);
      setPreviewActionMessage("Preview image could not be downloaded. Please try again.");
    } finally {
      setPreviewActionPending(null);
    }
  };

  const downloadPreviewPdf = async () => {
    setPreviewActionPending("pdf");
    setPreviewActionMessage("");
    try {
      const dataUrl = await capturePreviewPng();
      const printWindow = window.open("", "_blank", "width=900,height=1100");
      if (!printWindow) {
        setPreviewActionMessage("PDF preview could not open. Please allow popups and try again.");
        return;
      }
      const generatedAt = new Date().toLocaleString();
      printWindow.document.write(buildPreviewPdfHtml({
        businessName,
        programName,
        generatedAt,
        imageDataUrl: dataUrl,
        summary: [
          ["Card Style", selectedStyleLabel],
          ["Typography", selectedTypographyLabel],
          ["Reward Progress", selectedJourneyLabel],
          ["Stamp Design", selectedStampIconLabel],
          ["Background", `${selectedBackgroundLabel}${backgroundStyle === "PATTERN" ? ` · ${selectedPatternLabel}` : ""}`],
          ["Finish", selectedFinishLabel],
          ["Visibility", `${visibleSectionCount}/${designStudioCardContentOptions.length} sections`],
        ],
      }));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setPreviewActionMessage("PDF opened for download.");
    } catch (error) {
      console.error("Design preview PDF export failed", error);
      setPreviewActionMessage("PDF could not be prepared. Please try again.");
    } finally {
      setPreviewActionPending(null);
    }
  };

  const copyPreviewLink = async () => {
    setPreviewActionPending("link");
    setPreviewActionMessage("");
    try {
      const previewUrl = `${window.location.origin}/dashboard/programs/${programUuid}/design-studio?preview=true`;
      await navigator.clipboard.writeText(previewUrl);
      setPreviewActionMessage("Link copied.");
    } catch (error) {
      console.error("Design preview link copy failed", error);
      setPreviewActionMessage("Preview link could not be copied. Copy it from the browser address bar instead.");
    } finally {
      setPreviewActionPending(null);
    }
  };

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,70fr)_minmax(300px,30fr)] lg:items-start xl:grid-cols-[minmax(0,70fr)_minmax(340px,30fr)] 2xl:gap-10">
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
          title="Customer Preview"
          description="Live Preview"
          className="rounded-3xl border-[var(--business-primary-soft,#E2E8F0)] bg-gradient-to-b from-white to-[#F8FAFC] p-4 shadow-lg shadow-slate-200/60 md:p-5"
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Preview</p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">Updated automatically</p>
                </div>
                <p className="text-xs font-bold text-[#94A3B8]">Last updated just now</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Design history controls">
                <button
                  type="button"
                  onClick={undoDesignChange}
                  disabled={!canUndoDesign}
                  className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                  aria-label="Undo last design change"
                  title="Undo (Ctrl/Cmd+Z)"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={redoDesignChange}
                  disabled={!canRedoDesign}
                  className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                  aria-label="Redo design change"
                  title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
                >
                  Redo
                </button>
              </div>

              <div className="mt-3 grid gap-2">
                <div className="grid gap-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Preview Context</p>
                  <div className="grid grid-cols-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-1" aria-label="Preview context">
                  {previewContextOptions.map((option) => {
                    const active = previewContext === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPreviewContext(option.value)}
                        className="rounded-xl px-2 py-2 text-xs font-black text-[#64748B] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:business-bg"
                        data-active={active}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                  </div>
                </div>

                <div className="grid gap-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Zoom</p>
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(previousPreviewZoom(previewZoom))}
                    className="grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-[#64748B] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)]"
                    aria-label="Zoom out"
                  >
                    -
                  </button>
                  <div className="flex flex-1 justify-center gap-1">
                    {previewZoomOptions.map((option) => {
                      const active = previewZoom === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPreviewZoom(option.value)}
                          className="rounded-xl px-2.5 py-2 text-xs font-black text-[#64748B] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:bg-white data-[active=true]:text-[#111827] data-[active=true]:shadow-sm"
                          data-active={active}
                          aria-pressed={active}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(nextPreviewZoom(previewZoom))}
                    className="grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-[#64748B] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)]"
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                </div>
                </div>
              </div>
            </div>

            <div ref={previewExportRef}>
              <PreviewContextFrame context={previewContext} label={selectedPreviewContextLabel}>
                <div
                  key={`${layoutStyle}-${stampJourneyStyle}-${stampIcon}-${rewardStyle}-${typographyPreset}-${decorationStyle}-${previewZoom}-${previewContext}`}
                  className="w-full origin-top transition duration-200 ease-out motion-reduce:transition-none"
                  style={{ transform: `scale(${previewZoomScales[previewZoom]})` }}
                >
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
                    stampJourneyStyle={stampJourneyStyle}
                    stampIcon={stampIcon}
                    rewardStyle={rewardStyle}
                    typographyPreset={typographyPreset}
                    backgroundStyle={backgroundStyle}
                    backgroundPattern={backgroundPattern}
                  />
                </CardFinishPreviewFrame>
              </div>
              </PreviewContextFrame>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-4 shadow-sm">
              <div className="mb-3">
                <p className="text-sm font-black text-[#111827]">Preview Actions</p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">Export or share this design preview before saving.</p>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={downloadPreviewPng}
                    disabled={previewActionPending !== null}
                    className="rounded-xl business-bg px-3 py-2.5 text-sm font-black transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                  >
                    {previewActionPending === "png" ? "Preparing..." : "Download PNG"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadPreviewPdf}
                    disabled={previewActionPending !== null}
                    className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm font-black text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                  >
                    {previewActionPending === "pdf" ? "Preparing..." : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={copyPreviewLink}
                    disabled={previewActionPending !== null}
                    className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm font-black text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                  >
                    {previewActionPending === "link" ? "Copying..." : "Copy Preview Link"}
                  </button>
                </div>
                {previewActionMessage ? (
                  <p className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#475569]" aria-live="polite">
                    {previewActionMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-4 shadow-sm">
              <div className="mb-3">
                <p className="text-sm font-black text-[#111827]">Design Summary</p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">A read-only summary of the current preview configuration.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PreviewChip label={`Card Style: ${selectedStyleLabel}`} />
                <PreviewChip label={`Typography: ${selectedTypographyLabel}`} />
                <PreviewChip label={`Reward Progress: ${selectedJourneyLabel}`} />
                <PreviewChip label={`Stamp Design: ${selectedStampIconLabel}`} />
                <PreviewChip label={`Background: ${selectedBackgroundLabel}`} />
                {backgroundStyle === "PATTERN" ? <PreviewChip label={`Pattern: ${selectedPatternLabel}`} /> : null}
                <PreviewChip label={`Finish: ${selectedFinishLabel}`} />
                <PreviewChip label={`Visibility: ${visibleSectionCount}/${designStudioCardContentOptions.length}`} />
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Card Status</p>
              <div className="flex flex-wrap gap-2">
                <PreviewChip label={activeProfessionalPreset?.category ?? "Custom"} />
                <PreviewChip label={activeProfessionalPreset?.name ?? "Manual Design"} />
                <PreviewChip label={selectedStyleLabel} />
                <PreviewChip label={selectedTypographyLabel} />
                <PreviewChip label={selectedJourneyLabel} />
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-3 text-sm text-[#64748B] shadow-sm">
              <p className="font-semibold text-[#111827]">Preview updates live as you edit</p>
              <p className="mt-1">{previewContextFooter[previewContext]}</p>
            </div>
          </div>
        </SectionCard>
      </aside>

      <div className="order-last grid min-w-0 gap-8 lg:order-first lg:max-w-[1080px] [&>section]:rounded-2xl [&>section]:p-5 md:[&>section]:p-6">
        <SectionCard title="Choose how you'd like to start" description="Pick a professional template, build from scratch, or copy an existing design.">
          <div className="grid gap-3">
            <div className="grid gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 md:grid-cols-3">
              {designStartOptions.map((option) => {
                const active = designStartMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setDesignStartMode(option.value);
                      if (option.value === "manual") setPresetApplied(true);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-transparent bg-transparent px-4 py-3 text-left transition hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] data-[active=true]:border-[var(--business-primary)] data-[active=true]:bg-white data-[active=true]:shadow-sm"
                    data-active={active}
                    aria-pressed={active}
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#CBD5E1] bg-white text-[10px] font-black data-[active=true]:border-[var(--business-primary)] data-[active=true]:business-bg" data-active={active}>
                      {active ? "*" : ""}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-[#111827]">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-[#64748B]">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {businessPresetsVisible ? (
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
        ) : null}

        {professionalTemplatesVisible ? (
        <SectionCard title="Professional Templates" description="Choose a business type, then browse professional starting points.">
          <div className="grid gap-8">
            <div className="grid gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-2xl font-black tracking-tight text-[#111827]">Professional Templates</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {filteredProfessionalPresets.length} templates available across Restaurant, Cafe, Beauty, Car Wash, and more.
                  </p>
                </div>
                <label className="relative w-full lg:max-w-sm">
                  <span className="sr-only">Search Templates</span>
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={professionalPresetSearch}
                    onChange={(event) => setProfessionalPresetSearch(event.target.value)}
                    placeholder="Search templates by name or business..."
                    className="h-14 w-full rounded-2xl border border-[#CBD5E1] bg-white pl-11 pr-11 text-sm font-medium text-[#111827] shadow-sm outline-none transition focus:border-[var(--business-primary)] focus:ring-2 focus:ring-[var(--business-primary)]/20"
                  />
                  {professionalPresetSearch ? (
                    <button
                      type="button"
                      onClick={() => setProfessionalPresetSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-bold text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)]"
                    >
                      Clear
                    </button>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Business Type</p>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1" aria-label="Professional preset categories">
                {professionalPresetCategoryOptions.map((option) => {
                  const active = professionalPresetCategory === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProfessionalPresetCategory(option.value)}
                      className="shrink-0 rounded-full border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-black text-[#64748B] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:bg-[var(--business-primary-soft)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 data-[active=true]:border-[var(--business-primary)] data-[active=true]:business-bg"
                      data-active={active}
                      aria-pressed={active}
                    >
                      {option.icon} {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xl font-black tracking-tight text-[#111827]">Showing {filteredProfessionalPresets.length} Templates</p>
                <p className="mt-1 text-sm text-[#64748B]">
                  {professionalPresetCategory === "All" ? "Restaurant • Cafe • Beauty • Barbershop • Car Wash • General" : `${selectedProfessionalCategoryLabel} templates`}
                </p>
              </div>
            </div>

            {filteredProfessionalPresets.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProfessionalPresets.map((preset) => {
                  const active = activePresetId === preset.id;
                  return (
                    <article
                      key={preset.id}
                      className="group grid overflow-hidden rounded-[1.65rem] border border-[#E2E8F0] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-[var(--business-primary)] hover:shadow-2xl data-[active=true]:border-blue-500 data-[active=true]:shadow-xl data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                      data-active={active}
                    >
                      <button
                        type="button"
                        onClick={() => applyProfessionalPreset(preset)}
                        className="grid gap-5 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-inset"
                        aria-pressed={active}
                      >
                        <span className="relative [&>span]:min-h-[190px] [&>span]:p-5">
                          <PresetThumbnail preset={preset} />
                          {active ? (
                            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                              <span aria-hidden="true">✓</span>
                              Selected
                            </span>
                          ) : null}
                        </span>
                        <span className="min-w-0 px-1 pb-1">
                          <span className="block truncate text-lg font-black text-[#111827]">{preset.name}</span>
                          <span className="mt-1 block text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">{preset.category}</span>
                          <span className="mt-3 line-clamp-1 block text-sm leading-6 text-[#64748B]">{preset.description}</span>
                        </span>
                      </button>
                      <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                        <button
                          type="button"
                          onClick={() => applyProfessionalPreset(preset)}
                          className="rounded-xl px-3 py-2 text-sm font-bold text-[#64748B] transition hover:bg-white hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)]"
                        >
                          Preview
                        </button>
                        {active ? (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white">
                            <span aria-hidden="true">✓</span>
                            Selected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => applyProfessionalPreset(preset)}
                            className="rounded-xl business-bg px-3 py-2 text-sm font-black transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                          >
                            Use Template
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="grid place-items-center gap-4 rounded-[1.5rem] border border-dashed border-[#CBD5E1] bg-white p-10 text-center text-sm text-[#64748B]">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F8FAFC] text-2xl" aria-hidden="true">⌕</div>
                <p className="text-lg font-black text-[#111827]">No templates found</p>
                <p>Try another keyword or choose another business type.</p>
                <button
                  type="button"
                  onClick={() => {
                    setProfessionalPresetCategory("All");
                    setProfessionalPresetSearch("");
                  }}
                  className="w-fit rounded-xl border border-[var(--business-primary)] px-3 py-2 text-sm font-semibold business-text transition hover:bg-[var(--business-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </SectionCard>
        ) : presetApplied && designStartMode === "template" ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setPresetApplied(false);
                setDesignStartMode("template");
              }}
              className="rounded-xl border border-[var(--business-primary)] px-4 py-2 text-sm font-black business-text transition hover:bg-[var(--business-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
            >
              Choose Another Template
            </button>
          </div>
        ) : null}

        {duplicateDesignVisible ? (
        <SectionCard title="Duplicate From Another Program" description="Copy a design from one of your existing loyalty programs.">
          {sourcePrograms.length > 0 ? (
            <div className="grid gap-4">
              {copiedSourceProgramUuid ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Design copied into the preview. Review the manual builder below, then click Save Design to apply it to this program.
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {sourcePrograms.map((sourceProgram) => {
                  const active = copiedSourceProgramUuid === sourceProgram.uuid;
                  return (
                    <article
                      key={sourceProgram.uuid}
                      className="grid gap-4 rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-lg data-[active=true]:border-blue-500 data-[active=true]:shadow-xl data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                      data-active={active}
                    >
                      <div className="relative">
                        <PresetThumbnail preset={sourceProgramToThumbnailPreset(sourceProgram)} />
                        {active ? (
                          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                            <span aria-hidden="true">✓</span>
                            Copied
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-[#111827]">{sourceProgram.name}</p>
                        <p className="mt-1 text-sm leading-6 text-[#64748B]">{designSummary(sourceProgram.cardDesign)}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">Design only</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySourceProgramDesign(sourceProgram)}
                        className="w-full rounded-xl border border-[var(--business-primary)] px-3 py-2 text-sm font-semibold business-text transition hover:bg-[var(--business-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2 sm:w-fit"
                        aria-pressed={active}
                      >
                        {active ? "Applied to Preview" : "Apply Design"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-5 text-sm text-[#64748B]">
              No other loyalty programs are available yet. Create another program to duplicate its card design here.
            </div>
          )}
        </SectionCard>
        ) : null}

        {manualEditorVisible ? (
          <div className="grid gap-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
            <ManualBuilderGroup title="Appearance" description="Customize the overall visual style of your loyalty card." defaultOpen>
              <SectionCard title="Card Style" description="Choose the overall personality of your loyalty card.">
          <div className="grid gap-4 md:grid-cols-2">
            {designStudioTemplateOptions.map((option) => (
              <label key={option.value} className="group cursor-pointer rounded-[1.35rem] border border-[#E2E8F0] bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-lg has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)] has-[:checked]:shadow-lg">
                <input
                  type="radio"
                  name="layoutStyle"
                  value={option.value}
                  checked={layoutStyle === option.value}
                  onChange={() => commitDesignChange({ ...currentDesignSnapshot, layoutStyle: option.value })}
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
                  onClick={() => commitDesignChange({ ...currentDesignSnapshot, backgroundStyle: option.value })}
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
                    commitDesignChange({
                      ...currentDesignSnapshot,
                      backgroundPattern: option.value,
                      backgroundStyle: option.value !== "NONE" ? "PATTERN" : currentDesignSnapshot.backgroundStyle,
                    });
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

              <SectionCard title="Typography" description="Choose the personality of your loyalty card.">
          <div className="grid gap-3 md:grid-cols-2">
            {designStudioTypographyOptions.map((option) => {
              const active = typographyPreset === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => commitDesignChange({ ...currentDesignSnapshot, typographyPreset: option.value })}
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
                  onClick={() => commitDesignChange({ ...currentDesignSnapshot, decorationStyle: option.value })}
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
            </ManualBuilderGroup>

            <ManualBuilderGroup title="Loyalty Experience" description="Customize how customers experience collecting rewards.">
              <SectionCard title="Reward Progress" description="Choose the progress pattern that best matches how customers earn their next reward.">
          <div className="grid gap-3 md:grid-cols-3">
            {designStudioStampJourneyOptions.map((option) => (
              <label key={option.value} className="group flex min-h-28 cursor-pointer gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--business-primary)] hover:shadow-md has-[:checked]:border-[var(--business-primary)] has-[:checked]:bg-[var(--business-primary-soft)] has-[:checked]:shadow-md">
                <input
                  type="radio"
                  name="stampJourneyStyle"
                  value={option.value}
                  checked={stampJourneyStyle === option.value}
                  onChange={() => commitDesignChange({ ...currentDesignSnapshot, stampJourneyStyle: option.value })}
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
                  onChange={() => commitDesignChange({ ...currentDesignSnapshot, stampIcon: option.value })}
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
                  onClick={() => commitDesignChange({ ...currentDesignSnapshot, rewardStyle: option.value })}
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
            </ManualBuilderGroup>

            <ManualBuilderGroup title="Card Content" description="Choose which information appears on the loyalty card.">
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
                      commitDesignChange({
                        ...currentDesignSnapshot,
                        visibleSections: {
                          ...currentDesignSnapshot.visibleSections,
                          [option.value]: !currentDesignSnapshot.visibleSections[option.value],
                        },
                      })
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
            </ManualBuilderGroup>

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

function ManualBuilderGroup({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-inset md:p-6"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-lg font-black text-[#111827]">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-[#64748B]">{description}</span>
        </span>
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E2E8F0] bg-white text-lg font-black business-text transition-transform duration-200 data-[open=true]:rotate-180"
          data-open={open}
          aria-hidden="true"
        >
          v
        </span>
      </button>
      <div className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-5 border-t border-[#E2E8F0] bg-[#F8FAFC]/70 p-4 md:p-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

function PreviewChip({ label }: { label: string }) {
  return <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] shadow-sm">{label}</span>;
}

function filenameSafeLocal(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "design";
}

function labelizeLocal(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPreviewPdfHtml({
  businessName,
  programName,
  generatedAt,
  imageDataUrl,
  summary,
}: {
  businessName: string;
  programName: string;
  generatedAt: string;
  imageDataUrl: string;
  summary: Array<[string, string]>;
}) {
  const summaryHtml = summary
    .map(([label, value]) => `<div class="chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(programName)} Design Preview</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; color: #111827; font-family: Arial, sans-serif; }
    main { width: min(860px, 100%); margin: 0 auto; padding: 40px; }
    .sheet { min-height: 100vh; border: 1px solid #e2e8f0; border-radius: 28px; background: white; padding: 36px; }
    .eyebrow { color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 10px 0 0; font-size: 30px; line-height: 1.1; }
    .meta { margin-top: 8px; color: #64748b; font-size: 13px; }
    .preview { margin: 28px auto; display: block; max-width: 420px; width: 100%; border-radius: 28px; }
    .summary { margin-top: 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .chip { border: 1px solid #e2e8f0; border-radius: 16px; background: #f8fafc; padding: 12px 14px; }
    .chip span { display: block; color: #64748b; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .chip strong { display: block; margin-top: 5px; font-size: 13px; }
    @media print {
      body { background: white; }
      main { padding: 0; width: 100%; }
      .sheet { min-height: auto; border: 0; border-radius: 0; }
    }
  </style>
</head>
<body>
  <main>
    <section class="sheet">
      <p class="eyebrow">LoyaltyBase Design Preview</p>
      <h1>${escapeHtml(businessName)}</h1>
      <p class="meta">${escapeHtml(programName)} · Generated ${escapeHtml(generatedAt)}</p>
      <img class="preview" src="${imageDataUrl}" alt="Loyalty card design preview" />
      <p class="eyebrow">Design Summary</p>
      <div class="summary">${summaryHtml}</div>
    </section>
  </main>
</body>
</html>`;
}

function sectionVisibilityMatches(expected: CardSectionVisibility, actual: CardSectionVisibility) {
  return designStudioCardContentOptions.every((option) => expected[option.value] === actual[option.value]);
}

function cloneDesignSnapshot(snapshot: DesignHistorySnapshot): DesignHistorySnapshot {
  return {
    ...snapshot,
    visibleSections: { ...snapshot.visibleSections },
  };
}

function designSnapshotsMatch(left: DesignHistorySnapshot, right: DesignHistorySnapshot) {
  return (
    left.layoutStyle === right.layoutStyle &&
    left.backgroundStyle === right.backgroundStyle &&
    left.backgroundPattern === right.backgroundPattern &&
    left.stampJourneyStyle === right.stampJourneyStyle &&
    left.stampIcon === right.stampIcon &&
    left.rewardStyle === right.rewardStyle &&
    left.typographyPreset === right.typographyPreset &&
    left.decorationStyle === right.decorationStyle &&
    sectionVisibilityMatches(left.visibleSections, right.visibleSections)
  );
}

function presetToDesignSnapshot(preset: DesignStudioProfessionalPreset): DesignHistorySnapshot {
  return {
    layoutStyle: preset.layoutStyle,
    backgroundStyle: preset.backgroundStyle,
    backgroundPattern: preset.backgroundPattern,
    stampJourneyStyle: preset.stampJourneyStyle,
    stampIcon: preset.stampIcon,
    rewardStyle: preset.rewardStyle,
    typographyPreset: preset.typographyPreset,
    decorationStyle: preset.decorationStyle,
    visibleSections: { ...preset.visibleSections },
  };
}

function isEditableKeyboardTarget(target: HTMLElement | null) {
  if (!target) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
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

function PreviewContextFrame({ children, context, label }: { children: ReactNode; context: PreviewContext; label: string }) {
  if (context === "apple-wallet") {
    return (
      <div className="rounded-[2rem] bg-[radial-gradient(circle_at_top,#F8FAFC_0%,#EEF2FF_46%,#CBD5E1_100%)] p-3 transition-colors duration-200">
        <div className="mx-auto max-w-[286px] overflow-hidden rounded-[2rem] border border-white/70 bg-[#F8FAFC] shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white/85 px-4 py-3">
            <span className="text-sm font-black text-[#111827]">Wallet</span>
            <span className="rounded-full bg-[#EEF2FF] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#475569]">Pass</span>
          </div>
          <div className="grid min-h-[540px] content-start gap-3 bg-[linear-gradient(180deg,#F8FAFC_0%,#E2E8F0_100%)] px-3 py-5">
            <div className="mx-auto h-5 w-40 rounded-t-[1.3rem] bg-white/60 shadow-sm" aria-hidden="true" />
            <div className="mx-auto flex w-full justify-center overflow-hidden rounded-[1.8rem] bg-white/40 px-1 pb-3 pt-1 shadow-xl shadow-slate-950/10">
              {children}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">{label} Preview</p>
      </div>
    );
  }

  if (context === "google-wallet") {
    return (
      <div className="rounded-[2rem] bg-[linear-gradient(135deg,#EFF6FF_0%,#F8FAFC_48%,#DCFCE7_100%)] p-3 transition-colors duration-200">
        <div className="mx-auto max-w-[286px] overflow-hidden rounded-[1.8rem] border border-[#D8E2EF] bg-[#F8FAFC] shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between bg-white px-4 py-3">
            <span className="text-sm font-black text-[#1F2937]">Google Wallet</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#E0F2FE] text-xs font-black text-[#0369A1]">G</span>
          </div>
          <div className="min-h-[540px] bg-[#F1F5F9] px-3 py-5">
            <div className="mb-4 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#64748B] shadow-sm">Loyalty passes</div>
            <div className="mx-auto flex w-full justify-center overflow-hidden rounded-[1.65rem] bg-white/75 px-1 pb-3 pt-1 shadow-lg shadow-slate-950/10">
              {children}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">{label} Preview</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] bg-[#F8FAFC] p-3 transition-colors duration-200">
      <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">iPhone Preview</p>
      <div className="mx-auto max-w-[258px] rounded-[2rem] border-[5px] border-[#111827] bg-[#111827] p-1 shadow-2xl shadow-slate-950/25">
        <div className="relative overflow-hidden rounded-[1.65rem] bg-white p-1">
          <div className="absolute left-1/2 top-1.5 z-10 h-3 w-16 -translate-x-1/2 rounded-full bg-[#111827]" aria-hidden="true" />
          <div className="h-[520px] overflow-hidden rounded-[1.45rem] bg-[#F8FAFC] pt-5">
            <div className="flex min-h-full items-start justify-center overflow-hidden px-1 pb-2">{children}</div>
          </div>
        </div>
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
  stampJourneyStyle,
  stampIcon,
  rewardStyle,
  typographyPreset,
  backgroundStyle,
  backgroundPattern,
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
  stampJourneyStyle: CardDesignStampJourneyStyle;
  stampIcon: CardDesignStampIcon;
  rewardStyle: CardDesignRewardStyle;
  typographyPreset: CardDesignTypographyPreset;
  backgroundStyle: "SOLID" | "GRADIENT" | "PATTERN";
  backgroundPattern: CardDesignBackgroundPattern;
}) {
  const typography = liveTypographyStyles[typographyPreset] ?? liveTypographyStyles.MODERN;
  const reward = rewardBoxStyles[rewardStyle] ?? rewardBoxStyles.FILLED;
  const liveBackground = getLivePreviewBackground(theme.cardBackground, backgroundStyle, backgroundPattern);

  return (
    <div className="overflow-hidden rounded-[1.45rem] p-4" style={{ background: liveBackground, color: theme.cardText }}>
      <div className="flex items-start justify-between gap-3">
        {(visibleSections.logo || visibleSections.businessName || visibleSections.programName) ? (
          <div className="flex min-w-0 items-start gap-2.5">
            {visibleSections.logo ? (
              <span
                className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-black"
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
              {visibleSections.businessName ? <p className="line-clamp-2 text-[13px] font-black leading-tight">{businessName}</p> : null}
              {visibleSections.programName ? (
                <p className="mt-0.5 truncate text-[11px] font-semibold" style={{ color: theme.mutedText }}>
                  {programName}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {visibleSections.tierBadge ? (
          <span
            className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]"
            style={{ background: theme.badgeBackground, color: theme.badgeText, borderColor: theme.badgeBorder }}
          >
            {tierIcon} {tierLabel}
          </span>
        ) : null}
      </div>

      {visibleSections.customerName ? (
        <div className="mt-5">
          <p className={typography.label} style={{ color: theme.mutedText }}>
            Customer
          </p>
          <p className={typography.customer}>{customerName}</p>
          <p className={typography.supporting} style={{ color: theme.mutedText }}>
            Member since {memberSince}
          </p>
        </div>
      ) : null}

      {visibleSections.progress ? (
        <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-3.5">
          <p className={typography.label} style={{ color: theme.mutedText }}>
            Progress
          </p>
          <PreviewProgress
            stampJourneyStyle={stampJourneyStyle}
            stampIcon={stampIcon}
            theme={theme}
            typography={typography}
            showVisits={visibleSections.visits}
          />
          {visibleSections.visits ? <p className="mt-2 text-xs font-medium" style={{ color: theme.mutedText }}>3 visits until reward</p> : null}
        </div>
      ) : null}

      {visibleSections.rewardBox ? (
        <div className={`relative mt-4 overflow-hidden rounded-2xl border p-4 ${reward.className}`} style={{ ...reward.style, color: reward.textColor }}>
          {rewardStyle === "TICKET" ? (
            <>
              <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" style={{ background: liveBackground }} />
              <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" style={{ background: liveBackground }} />
            </>
          ) : null}
          <p className={typography.label} style={{ color: reward.mutedColor }}>
            Next reward
          </p>
          <p className={typography.reward}>{rewardName}</p>
          <p className="mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: reward.badgeBackground, color: reward.badgeColor }}>3 Visits Remaining</p>
        </div>
      ) : null}

      {visibleSections.qr ? (
        <div className="mt-4 rounded-2xl p-4" style={{ background: theme.qrSurface, color: "#111827" }}>
          <div className="grid gap-3 text-center">
            <span className="block text-sm font-black">Scan at Checkout</span>
            <span className="mx-auto grid h-24 w-24 shrink-0 grid-cols-3 grid-rows-3 gap-1 rounded-2xl bg-white p-3.5 ring-1 ring-black/10">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} className={index % 2 === 0 ? "rounded-sm bg-[#111827]" : "rounded-sm bg-[#E5E7EB]"} />
              ))}
            </span>
            <span className="mx-auto max-w-32 text-xs font-semibold text-[#64748B]">Present this QR to staff</span>
          </div>
        </div>
      ) : null}

      {visibleSections.referral ? (
        <div className="mt-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-semibold">
          Refer a friend and share this loyalty card.
        </div>
      ) : null}

      {visibleSections.footer ? (
        <div className="mt-4 rounded-full px-4 py-2.5 text-center text-xs font-black" style={{ background: theme.ctaBackground, color: theme.ctaForeground }}>
          Scan at Checkout
        </div>
      ) : null}
    </div>
  );
}

type LiveTypographyStyle = {
  label: string;
  customer: string;
  progress: string;
  reward: string;
  supporting: string;
};

type PreviewProgressProps = {
  stampJourneyStyle: CardDesignStampJourneyStyle;
  stampIcon: CardDesignStampIcon;
  theme: ReturnType<typeof resolveCardThemeColors>;
  typography: LiveTypographyStyle;
  showVisits: boolean;
};

function PreviewProgress({ stampJourneyStyle, stampIcon, theme, typography, showVisits }: PreviewProgressProps) {
  const stampMark = getStampIconMark(stampIcon);
  const completed = 7;
  const total = 10;
  const steps = Array.from({ length: total });

  if (stampJourneyStyle === "CIRCLES") {
    return (
      <div className="mt-2 grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <p className={typography.progress}>7 / 10 Visits</p>
          {showVisits ? <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: theme.mutedText }}>3 left</p> : null}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {steps.map((_, index) => {
            const filled = index < completed;
            return (
              <span
                key={index}
                className="grid aspect-square place-items-center rounded-full border text-[9px] font-black"
                style={{
                  background: filled ? theme.progressFill : theme.progressTrack,
                  borderColor: filled ? theme.progressFill : "rgba(255,255,255,0.3)",
                  color: filled ? theme.ctaForeground : theme.mutedText,
                }}
              >
                {filled ? stampMark : ""}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (stampJourneyStyle === "CONNECTED_DOTS") {
    return (
      <div className="mt-2 grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <p className={typography.progress}>7 / 10 Visits</p>
          {showVisits ? <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: theme.mutedText }}>3 left</p> : null}
        </div>
        <div className="relative flex items-center justify-between gap-1 py-2">
          <span className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ background: theme.progressTrack }} />
          <span className="absolute left-3 top-1/2 h-1 w-[68%] -translate-y-1/2 rounded-full" style={{ background: theme.progressFill }} />
          {steps.map((_, index) => {
            const filled = index < completed;
            return (
              <span
                key={index}
                className="relative z-10 grid h-6 w-6 place-items-center rounded-full border text-[7px] font-black"
                style={{
                  background: filled ? theme.progressFill : theme.cardBackground,
                  borderColor: filled ? theme.progressFill : theme.progressTrack,
                  color: filled ? theme.ctaForeground : theme.mutedText,
                }}
              >
                {filled ? stampMark : ""}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <p className={typography.progress}>7 / 10 Visits</p>
        {showVisits ? <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: theme.mutedText }}>3 left</p> : null}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: theme.progressTrack }}>
        <div className="h-full w-[70%] rounded-full" style={{ background: theme.progressFill }} />
      </div>
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

const liveTypographyStyles: Record<CardDesignTypographyPreset, LiveTypographyStyle> = {
  MODERN: {
    label: "text-[10px] font-semibold uppercase tracking-[0.24em]",
    customer: "mt-1.5 text-[1.6rem] font-black leading-[1.05]",
    progress: "text-xl font-black",
    reward: "mt-1.5 text-xl font-black leading-tight",
    supporting: "mt-1.5 text-xs",
  },
  CLASSIC: {
    label: "text-[10px] font-semibold uppercase tracking-[0.18em]",
    customer: "mt-1.5 text-[1.55rem] font-bold leading-[1.12]",
    progress: "text-lg font-bold",
    reward: "mt-1.5 text-lg font-bold leading-tight",
    supporting: "mt-1.5 text-xs",
  },
  PREMIUM: {
    label: "text-[10px] font-black uppercase tracking-[0.26em]",
    customer: "mt-1.5 text-[1.7rem] font-black leading-none tracking-tight",
    progress: "text-xl font-black tracking-tight",
    reward: "mt-1.5 text-xl font-black leading-tight tracking-tight",
    supporting: "mt-1.5 text-xs font-semibold",
  },
  LUXURY: {
    label: "text-[10px] font-semibold uppercase tracking-[0.32em]",
    customer: "mt-1.5 text-[1.55rem] font-semibold leading-[1.15] tracking-wide",
    progress: "text-lg font-semibold tracking-wide",
    reward: "mt-1.5 text-lg font-semibold leading-tight tracking-wide",
    supporting: "mt-1.5 text-xs",
  },
  PLAYFUL: {
    label: "text-[10px] font-black uppercase tracking-[0.16em]",
    customer: "mt-1.5 text-[1.65rem] font-black leading-[1.08]",
    progress: "text-xl font-black",
    reward: "mt-1.5 text-xl font-black leading-tight",
    supporting: "mt-1.5 text-xs font-semibold",
  },
  MINIMAL: {
    label: "text-[10px] font-medium uppercase tracking-[0.24em]",
    customer: "mt-1.5 text-[1.5rem] font-light leading-[1.15] tracking-wide",
    progress: "text-lg font-light tracking-wide",
    reward: "mt-1.5 text-lg font-light leading-tight tracking-wide",
    supporting: "mt-1.5 text-xs",
  },
};

const backgroundStylePreview: Record<"SOLID" | "GRADIENT" | "PATTERN", string> = {
  SOLID: "#F8FAFC",
  GRADIENT: "linear-gradient(135deg, #FFFFFF 0%, #FDBA74 100%)",
  PATTERN: "radial-gradient(circle at 4px 4px, #CBD5E1 1.5px, transparent 1.5px), #F8FAFC",
};

const liveBackgroundPatterns: Record<CardDesignBackgroundPattern, string> = {
  NONE: "none",
  SUBTLE_DOTS: "radial-gradient(circle at 8px 8px, rgba(255,255,255,0.28) 1.5px, transparent 1.5px)",
  DIAGONAL_LINES: "repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 12px)",
  WAVES: "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.18) 0 18%, transparent 19%), radial-gradient(ellipse at 80% 70%, rgba(255,255,255,0.14) 0 16%, transparent 17%)",
  COFFEE_BEANS: "radial-gradient(ellipse at 14px 12px, rgba(255,255,255,0.22) 0 5px, transparent 6px)",
  SCISSORS: "repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 18px)",
  WATER_BUBBLES: "radial-gradient(circle at 12px 12px, rgba(255,255,255,0.24) 0 4px, transparent 5px), radial-gradient(circle at 32px 28px, rgba(255,255,255,0.16) 0 3px, transparent 4px)",
  FOOD_PATTERN: "repeating-radial-gradient(circle at 10px 10px, rgba(255,255,255,0.16) 0 2px, transparent 3px 18px)",
  BEAUTY_PATTERN: "radial-gradient(circle at 16px 16px, rgba(255,255,255,0.2) 0 5px, transparent 6px)",
};

function getLivePreviewBackground(baseBackground: string, backgroundStyle: "SOLID" | "GRADIENT" | "PATTERN", backgroundPattern: CardDesignBackgroundPattern) {
  if (backgroundStyle === "GRADIENT") {
    return `linear-gradient(135deg, ${baseBackground} 0%, rgba(249,115,22,0.18) 100%)`;
  }

  if (backgroundStyle === "PATTERN") {
    const pattern = liveBackgroundPatterns[backgroundPattern] ?? liveBackgroundPatterns.NONE;
    return pattern === "none" ? baseBackground : `${pattern}, ${baseBackground}`;
  }

  return baseBackground;
}

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

const previewContextOptions: Array<{ value: PreviewContext; label: string }> = [
  { value: "phone", label: "Phone" },
  { value: "apple-wallet", label: "Apple Wallet" },
  { value: "google-wallet", label: "Google Wallet" },
];

const previewContextFooter: Record<PreviewContext, string> = {
  phone: "Previewing your loyalty card on a customer's phone.",
  "apple-wallet": "Previewing your loyalty card inside Apple Wallet.",
  "google-wallet": "Previewing your loyalty card inside Google Wallet.",
};

const previewZoomOptions: Array<{ value: PreviewZoom; label: string }> = [
  { value: "75", label: "75%" },
  { value: "100", label: "100%" },
  { value: "125", label: "125%" },
  { value: "fit", label: "Fit" },
];

const previewZoomOrder: PreviewZoom[] = ["75", "100", "125", "fit"];

const previewZoomScales: Record<PreviewZoom, number> = {
  "75": 0.75,
  "100": 0.88,
  "125": 1,
  fit: 0.82,
};

function previousPreviewZoom(value: PreviewZoom): PreviewZoom {
  const index = previewZoomOrder.indexOf(value);
  return previewZoomOrder[Math.max(0, index - 1)] ?? "fit";
}

function nextPreviewZoom(value: PreviewZoom): PreviewZoom {
  const index = previewZoomOrder.indexOf(value);
  return previewZoomOrder[Math.min(previewZoomOrder.length - 1, index + 1)] ?? "fit";
}

const professionalPresetCategoryOptions: Array<{ value: ProfessionalPresetCategory; label: string; icon: string }> = [
  { value: "All", label: "All", icon: "All" },
  { value: "Restaurant", label: "Restaurant", icon: "Dine" },
  { value: "Café", label: "Cafe", icon: "Cafe" },
  { value: "Beauty Salon", label: "Beauty", icon: "Beauty" },
  { value: "Barbershop", label: "Barbershop", icon: "Cut" },
  { value: "Car Wash", label: "Car Wash", icon: "Auto" },
  { value: "General", label: "General", icon: "Biz" },
];

const designStartOptions: Array<{ value: DesignStartMode; label: string; description: string }> = [
  { value: "template", label: "Professional Template", description: "Recommended" },
  { value: "manual", label: "Build From Scratch", description: "Open the full editor" },
  { value: "duplicate", label: "Duplicate Existing Design", description: "Copy another program" },
];

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
