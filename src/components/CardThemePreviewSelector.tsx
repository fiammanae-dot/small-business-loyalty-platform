"use client";

import { useState } from "react";
import type { CardTheme } from "@prisma/client";
import { cardThemeOptions, resolveCardThemeColors } from "@/lib/card-themes";
import { LoyaltyWalletCard } from "@/components/public-card/LoyaltyWalletCard";

type PreviewBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  logoUrl: string | null;
};

export function CardThemePreviewSelector({
  selectedTheme,
  businessName,
  branding,
}: {
  selectedTheme: CardTheme;
  businessName: string;
  branding: PreviewBranding;
}) {
  const [previewTheme, setPreviewTheme] = useState<CardTheme | null>(null);
  const activePreview = previewTheme ? resolveCardThemeColors({ cardTheme: previewTheme, branding }) : null;

  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[#111827]">Wallet card style</p>
        <p className="text-sm text-[#6B7280]">Choose one of four wallet styles. Business Default uses your brand colors; the other styles are visual-only card treatments.</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cardThemeOptions.map((theme) => (
          <div key={theme.value} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 transition hover:border-[var(--business-primary,#F97316)] hover:bg-[var(--business-primary-soft,#FFF7ED)]">
            <label className="block cursor-pointer">
              <input type="radio" name="cardTheme" value={theme.value} defaultChecked={selectedTheme === theme.value} aria-label={`${theme.label} wallet card style`} className="sr-only peer" />
              <div className="rounded-xl border p-3 peer-checked:ring-2 peer-checked:ring-[var(--business-primary,#F97316)]" style={{ borderColor: theme.accent, backgroundColor: theme.surface }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide" style={{ color: theme.accent }}>{theme.eyebrow}</span>
                  <span className="h-6 w-6 rounded-full" style={{ background: theme.progressFill }} />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: theme.progressTrack }}>
                  <div className="h-full w-2/3 rounded-full" style={{ background: theme.progressFill }} />
                </div>
              </div>
              <span className="mt-3 block text-sm font-bold text-[#111827]">{theme.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{theme.description}</span>
            </label>
            <button type="button" onClick={() => setPreviewTheme(theme.value)} className="mt-3 h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:bg-[#FAFAFA] active:scale-[0.99]">
              Preview card
            </button>
          </div>
        ))}
      </div>

      {activePreview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/55 px-3 py-4 md:items-center" role="dialog" aria-modal="true" aria-label="Loyalty card theme preview">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close preview" onClick={() => setPreviewTheme(null)} />
          <section className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl md:p-5">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3 md:-mx-5 md:-mt-5 md:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Preview card</p>
                <h2 className="text-lg font-bold text-[#111827]">{activePreview.label}</h2>
              </div>
              <button type="button" onClick={() => setPreviewTheme(null)} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]">Close</button>
            </div>

            <div className="mt-4 grid gap-4">
              <LoyaltyWalletCard
                businessName={businessName}
                businessLogoUrl={branding.logoUrl}
                customerName="Mina Hanna"
                memberSince="Jun 2026"
                tierLabel="Silver Member"
                tierIcon="?"
                qrCode={null}
                rewardReady={false}
                theme={activePreview}
                programName="Coffee Club"
                rewardName="Free Coffee"
                progress={7}
                required={10}
                remaining={3}
                completion={70}
              />
              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide" style={{ color: activePreview.accent }}>Referral Preview</p>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Sample referral section shown for preview only. No customer data is created.</p>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
