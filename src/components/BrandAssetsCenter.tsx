"use client";

import { useState, type ReactNode } from "react";
import { saveBrandAssetsAction } from "@/app/dashboard/actions";
import { BusinessLogoAvatar } from "@/components/BusinessLogoAvatar";
import { BusinessLogoUploadField } from "@/components/BusinessLogoUploadField";
import { SectionCard } from "@/components/ui";

type BrandAssets = {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
};

const colorFields = [
  { name: "primaryColor", label: "Primary Color", helper: "Main brand color used across cards and workspaces." },
  { name: "secondaryColor", label: "Secondary Color", helper: "Supporting color for gradients and progress." },
  { name: "buttonColor", label: "Accent / Button Color", helper: "Buttons and primary actions." },
  { name: "backgroundColor", label: "Background Color", helper: "Page background behind the loyalty card." },
  { name: "textColor", label: "Text Color", helper: "Default text on branded surfaces." },
] as const;

const futureAssets = [
  { name: "Light Logo", description: "Optimized for dark surfaces." },
  { name: "Dark Logo", description: "Optimized for light surfaces." },
  { name: "Email Logo", description: "Used in customer email messages." },
  { name: "Website Favicon", description: "Browser tab icon for hosted pages." },
  { name: "Business Cover Image", description: "Hero image for public pages." },
] as const;

export function BrandAssetsCenter({
  csrfInput,
  businessName,
  initialAssets,
}: {
  csrfInput: ReactNode;
  businessName: string;
  initialAssets: BrandAssets;
}) {
  const [logoUrl, setLogoUrl] = useState(initialAssets.logoUrl);
  const [colors, setColors] = useState({
    primaryColor: initialAssets.primaryColor,
    secondaryColor: initialAssets.secondaryColor,
    backgroundColor: initialAssets.backgroundColor,
    textColor: initialAssets.textColor,
    buttonColor: initialAssets.buttonColor,
  });

  function setColor(name: keyof typeof colors, value: string) {
    setColors((current) => ({ ...current, [name]: value }));
  }

  return (
    <form action={saveBrandAssetsAction} className="grid gap-5 lg:grid-cols-[minmax(0,58fr)_minmax(300px,42fr)] lg:items-start">
      {csrfInput}
      <div className="grid min-w-0 gap-5">
        <SectionCard title="Business Logo" description="Your logo appears on loyalty cards, previews, referral pages, and Google Wallet passes.">
          <BusinessLogoUploadField value={logoUrl} onChange={setLogoUrl} businessName={businessName} />
        </SectionCard>

        <SectionCard title="Business Colors" description="Business identity colors applied everywhere your brand appears. Program-specific card appearance stays in the Design Studio.">
          <div className="grid gap-4 md:grid-cols-2">
            {colorFields.map((field) => (
              <div key={field.name} className="rounded-md border border-[#E2E8F0] bg-white p-4">
                <p className="text-sm font-semibold text-[#111827]">{field.label}</p>
                <p className="mt-1 text-xs text-[#64748B]">{field.helper}</p>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="color"
                    value={colors[field.name]}
                    onChange={(event) => setColor(field.name, event.target.value)}
                    aria-label={`${field.label} picker`}
                    className="h-11 w-14 cursor-pointer rounded-md border border-[#E5E7EB] bg-white p-1"
                  />
                  <input
                    type="text"
                    name={field.name}
                    value={colors[field.name]}
                    onChange={(event) => setColor(field.name, event.target.value)}
                    aria-label={`${field.label} hex value`}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 font-mono text-sm uppercase outline-none business-ring focus:ring-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Future Brand Assets" description="Planned brand asset slots. These are placeholders and are not connected yet.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {futureAssets.map((asset) => (
              <div key={asset.name} className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 opacity-80">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#111827]">{asset.name}</p>
                  <span className="rounded-full bg-[#E2E8F0] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                    Coming Soon
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#64748B]">{asset.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <button type="submit" className="h-11 w-fit rounded-md business-button px-5 text-sm font-semibold transition hover:brightness-95">
          Save Brand Assets
        </button>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-6">
        <SectionCard title="Live Brand Preview" description="How your business identity looks to customers. Card layout and stamps are previewed in the Design Studio.">
          <div className="grid gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Desktop</p>
            <BrandPreviewCard businessName={businessName} logoUrl={logoUrl} colors={colors} />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Mobile</p>
            <div className="mx-auto w-full max-w-[300px]">
              <BrandPreviewCard businessName={businessName} logoUrl={logoUrl} colors={colors} compact />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Palette</p>
              <div className="mt-2 flex gap-2">
                {(["primaryColor", "secondaryColor", "buttonColor", "backgroundColor", "textColor"] as const).map((name) => (
                  <span key={name} className="h-8 w-8 rounded-full ring-1 ring-black/10" style={{ backgroundColor: colors[name] }} title={colors[name]} />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </aside>
    </form>
  );
}

function BrandPreviewCard({
  businessName,
  logoUrl,
  colors,
  compact = false,
}: {
  businessName: string;
  logoUrl: string;
  colors: { primaryColor: string; secondaryColor: string; backgroundColor: string; textColor: string; buttonColor: string };
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] p-4" style={{ backgroundColor: colors.backgroundColor, color: colors.textColor }}>
      <div className="flex items-center gap-3">
        <BusinessLogoAvatar
          logoUrl={logoUrl || null}
          businessName={businessName || "Business"}
          size={compact ? "sm" : "md"}
          className="rounded-full text-white"
          style={{ backgroundColor: colors.primaryColor }}
        />
        <div className="min-w-0">
          <p className={`truncate font-black ${compact ? "text-sm" : "text-base"}`}>{businessName || "Your Business"}</p>
          <p className="text-xs opacity-70">Loyalty member preview</p>
        </div>
      </div>
      <p className={`mt-3 leading-6 opacity-90 ${compact ? "text-xs" : "text-sm"}`}>
        Typography preview: The quick brown fox jumps over the lazy dog.
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: `${colors.secondaryColor}55` }}>
        <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: colors.secondaryColor }} />
      </div>
      <button
        type="button"
        className={`mt-4 w-full rounded-xl font-bold text-white ${compact ? "min-h-10 text-xs" : "min-h-11 text-sm"}`}
        style={{ backgroundColor: colors.buttonColor }}
      >
        Primary Action
      </button>
    </div>
  );
}
