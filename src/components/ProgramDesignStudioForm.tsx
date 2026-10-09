"use client";

import { useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toPng } from "html-to-image";
import Link from "next/link";
import type { CardDesignLayoutStyle, CardDesignStampIcon } from "@/lib/card-design";
import { buildProgramPassView, walletColourLayoutStyle, walletPreviewDesign, type WalletPassBranding } from "@/lib/wallet-pass-view";
import { Button, SectionCard } from "@/components/ui";
import { CardColourPicker } from "@/components/wallet-pass/CardColourPicker";
import { StampIconChooser } from "@/components/wallet-pass/StampIconChooser";
import { CustomStampIconField } from "@/components/wallet-pass/CustomStampIconField";
import { WalletPassPreview } from "@/components/wallet-pass/WalletPassPreview";
import { StampIconGraphic } from "@/components/design-studio/StampIconGraphic";

type PreviewBranding = WalletPassBranding & { logoUrl: string | null };

/** The parts of a card design a wallet pass can actually show. */
export type WalletCardDesignChoice = {
  layoutStyle: CardDesignLayoutStyle;
  stampIcon: CardDesignStampIcon;
  /** The business's own uploaded stamp icon; null = the built-in stampIcon. */
  customStampIconUrl: string | null;
};

type SavedDesignOption = { uuid: string; name: string; cardDesign: WalletCardDesignChoice };

/**
 * Design Studio.
 *
 * Apple and Google Wallet draw every pass the same way: one background colour,
 * the business logo and name, one picture (the stamps or a photo), a few short
 * label/value rows and a QR code. So that is all this studio offers - a card
 * colour and a stamp icon - and the preview is the real pass layout, built from
 * the same view as the Apple pass. Options no wallet could show (backgrounds,
 * patterns, fonts, finishes, reward-box styles, section toggles) were removed
 * because they made the designed card differ from the card customers got.
 */
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
  lastSavedAt,
  branding,
  program,
  tiersEnabled,
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
  lastSavedAt: string;
  branding: PreviewBranding;
  program: { isMembership: boolean; requiredStamps: number; walletHeroStyle: string | null; walletPhotoUrl: string | null };
  tiersEnabled: boolean;
  initialDesign: WalletCardDesignChoice;
  businessPresets: Array<SavedDesignOption & { createdAt: string }>;
  sourcePrograms: SavedDesignOption[];
  stampIconOptions: Array<{ value: CardDesignStampIcon; label: string; recommended: boolean }>;
}) {
  const initialLayout = walletColourLayoutStyle(initialDesign.layoutStyle);
  const [layoutStyle, setLayoutStyle] = useState<CardDesignLayoutStyle>(initialLayout);
  const [stampIcon, setStampIcon] = useState<CardDesignStampIcon>(initialDesign.stampIcon);
  const [customStampIconUrl, setCustomStampIconUrl] = useState<string | null>(initialDesign.customStampIconUrl);
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const previewRef = useRef<HTMLDivElement | null>(null);
  const hasUnsavedChanges =
    layoutStyle !== initialLayout || stampIcon !== initialDesign.stampIcon || customStampIconUrl !== initialDesign.customStampIconUrl;

  const view = useMemo(() => {
    const total = Math.max(1, program.requiredStamps);
    // A sample customer partway through the card.
    const sampleProgress = Math.max(1, Math.round(total * 0.6));
    return buildProgramPassView({
      businessName,
      logoUrl: branding.logoUrl,
      branding,
      program: {
        name: programName,
        isMembership: program.isMembership,
        requiredStamps: total,
        cardDesign: walletPreviewDesign(layoutStyle, stampIcon, customStampIconUrl),
        walletHeroStyle: program.walletHeroStyle,
        photoUrl: program.walletPhotoUrl,
      },
      customerName: "Mina Hanna",
      progress: sampleProgress,
      membership: program.isMembership ? { remaining: Math.max(0, total - 1), total } : null,
      tierName: tiersEnabled && !program.isMembership ? "Silver" : null,
      reward: { ready: false, visitsToNext: Math.max(0, total - sampleProgress) },
    });
  }, [branding, businessName, customStampIconUrl, layoutStyle, program, programName, stampIcon, tiersEnabled]);

  const applySavedDesign = (option: SavedDesignOption) => {
    setLayoutStyle(walletColourLayoutStyle(option.cardDesign.layoutStyle));
    setStampIcon(option.cardDesign.stampIcon);
    setCustomStampIconUrl(option.cardDesign.customStampIconUrl);
    setAppliedFrom(option.name);
  };

  const downloadPng = async () => {
    setExportMessage("");
    try {
      if (!previewRef.current) throw new Error("Preview is not ready.");
      const dataUrl = await toPng(previewRef.current, { cacheBust: true, pixelRatio: 3, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `loyalty-card-${programName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "design"}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportMessage("PNG downloaded.");
    } catch (error) {
      console.error("Design preview PNG export failed", error);
      setExportMessage("The image could not be downloaded. Please try again.");
    }
  };

  const showsPhoto = program.walletHeroStyle === "PHOTO" && Boolean(program.walletPhotoUrl);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <input type="hidden" name={csrfName} value={csrfToken} />
      <input type="hidden" name="programUuid" value={programUuid} />
      <input type="hidden" name="layoutStyle" value={layoutStyle} />
      <input type="hidden" name="stampIcon" value={stampIcon} />
      <input type="hidden" name="customStampIconUrl" value={customStampIconUrl ?? ""} />

      <div className="grid min-w-0 gap-5">
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
          <p className="font-semibold text-[#171A21]">One card, everywhere</p>
          <p className="mt-1">
            Apple and Google Wallet draw every pass with one colour, your logo, one picture, a few lines of text and a QR code.
            What you choose here is applied to the wallet pass and to the card link customers open on the web, so they always match.
          </p>
        </div>

        {appliedFrom ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Design from &ldquo;{appliedFrom}&rdquo; applied to the preview. Save to use it on this program.
          </p>
        ) : null}

        <SectionCard
          title="Card colour"
          description="The background of the pass. Brand colour follows your Business Branding settings."
          actions={
            <Link href="/dashboard/settings?tab=branding" className="text-sm font-semibold business-text hover:underline">
              Business Branding
            </Link>
          }
        >
          <CardColourPicker value={layoutStyle} onChange={setLayoutStyle} branding={branding} mode="layoutStyle" />
        </SectionCard>

        <SectionCard
          title="Stamp icon"
          description={
            showsPhoto
              ? "Your card shows your own photo instead of the stamps. The icon is used if you switch back to the stamps."
              : "Drawn once per visit in the picture on the card. Filled for visits made, faded for visits to go."
          }
        >
          <div className="grid gap-4">
            <CustomStampIconField value={customStampIconUrl} onChange={setCustomStampIconUrl} />
            <StampIconChooser
              options={stampIconOptions}
              value={customStampIconUrl ? null : stampIcon}
              onChange={(icon) => {
                // Picking a built-in icon switches back from an uploaded one.
                setStampIcon(icon);
                setCustomStampIconUrl(null);
              }}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Card picture"
          description="The picture across the card shows the stamps, or a photo of your own."
          actions={
            <Link href={`/dashboard/programs/${programUuid}/edit`} className="text-sm font-semibold business-text hover:underline">
              Change picture
            </Link>
          }
        >
          <p className="text-sm text-[#475569]">
            {showsPhoto ? "Showing your photo." : "Showing the stamps."}{" "}
            You can change this in Edit Program under &ldquo;Picture on the wallet card&rdquo;.
          </p>
        </SectionCard>

        <SavedDesigns
          businessPresets={businessPresets}
          sourcePrograms={sourcePrograms}
          onApply={applySavedDesign}
          renamePresetAction={renamePresetAction}
          deletePresetAction={deletePresetAction}
        />

        <SectionCard title="Save as business preset" description="Optional. Reuse this colour and stamp icon on another program.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="presetName"
              placeholder="e.g. VIP card"
              maxLength={80}
              className="h-11 min-w-0 flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[var(--business-primary)] focus:ring-2 focus:ring-[var(--business-primary)]/20"
            />
            <Button formAction={savePresetAction} type="submit" variant="outline">
              Save preset
            </Button>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#64748B]">
            {hasUnsavedChanges ? "You have unsaved changes." : `Last saved ${new Date(lastSavedAt).toLocaleDateString()}.`}{" "}
            Saving updates cards already in customers&rsquo; wallets.
          </p>
          <SaveDesignButton />
        </div>
      </div>

      <aside className="grid gap-3 lg:sticky lg:top-6">
        <SectionCard title="Preview" description="Sample customer partway through the card.">
          <WalletPassPreview view={view} cardRef={previewRef} />
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex h-9 items-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#111827] hover:border-[var(--business-primary)]"
            >
              Download PNG
            </button>
            {exportMessage ? <span className="text-xs text-[#64748B]" role="status">{exportMessage}</span> : null}
          </div>
        </SectionCard>
      </aside>
    </form>
  );
}

function SaveDesignButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="business" size="lg" disabled={pending}>
      {pending ? "Saving..." : "Save Design"}
    </Button>
  );
}

function SavedDesigns({
  businessPresets,
  sourcePrograms,
  onApply,
  renamePresetAction,
  deletePresetAction,
}: {
  businessPresets: Array<SavedDesignOption & { createdAt: string }>;
  sourcePrograms: SavedDesignOption[];
  onApply: (option: SavedDesignOption) => void;
  renamePresetAction: (formData: FormData) => void | Promise<void>;
  deletePresetAction: (formData: FormData) => void | Promise<void>;
}) {
  if (!businessPresets.length && !sourcePrograms.length) return null;
  return (
    <SectionCard title="Start from a saved design" description="Copy the colour and stamp icon from a preset or from another program.">
      <div className="grid gap-3">
        {businessPresets.map((preset) => (
          <div key={preset.uuid} className="grid gap-3 rounded-xl border border-[#E5E7EB] p-3">
            <div className="flex items-center justify-between gap-3">
              <DesignChip design={preset.cardDesign} name={preset.name} detail={`Preset - ${new Date(preset.createdAt).toLocaleDateString()}`} />
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onApply(preset)}>
                  Apply
                </Button>
                <Button formAction={deletePresetAction} type="submit" name="presetUuid" value={preset.uuid} variant="outline" size="sm">
                  Delete
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                aria-label={`Rename ${preset.name}`}
                type="text"
                name={`renamePresetName:${preset.uuid}`}
                defaultValue={preset.name}
                maxLength={80}
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[var(--business-primary)]"
              />
              <Button formAction={renamePresetAction} type="submit" name="presetUuid" value={preset.uuid} variant="outline" size="sm">
                Rename
              </Button>
            </div>
          </div>
        ))}
        {sourcePrograms.map((source) => (
          <div key={source.uuid} className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] p-3">
            <DesignChip design={source.cardDesign} name={source.name} detail="Another program" />
            <Button type="button" variant="outline" size="sm" onClick={() => onApply(source)}>
              Apply
            </Button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function DesignChip({ design, name, detail }: { design: WalletCardDesignChoice; name: string; detail: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {design.customStampIconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={design.customStampIconUrl} alt="" className="h-7 w-7 shrink-0 object-contain" />
      ) : (
        <StampIconGraphic stampIcon={design.stampIcon} className="h-7 w-7 shrink-0" />
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#111827]">{name}</span>
        <span className="block text-xs text-[#6B7280]">{detail}</span>
      </span>
    </span>
  );
}
