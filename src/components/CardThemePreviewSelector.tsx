"use client";

import { useState } from "react";
import type { CardTheme } from "@prisma/client";
import { cardThemeOptions, resolveCardThemeColors } from "@/lib/card-themes";

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
        <p className="text-sm font-semibold text-[#111827]">Loyalty card theme</p>
        <p className="text-sm text-[#6B7280]">Choose how the public customer card should feel. Custom theme editing is reserved for a future release.</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cardThemeOptions.map((theme) => (
          <div key={theme.value} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 transition hover:border-[var(--business-primary,#F97316)] hover:bg-[var(--business-primary-soft,#FFF7ED)]">
            <label className="block cursor-pointer">
              <input type="radio" name="cardTheme" value={theme.value} defaultChecked={selectedTheme === theme.value} className="sr-only peer" />
              <div className="rounded-xl border p-3 peer-checked:ring-2 peer-checked:ring-[var(--business-primary,#F97316)]" style={{ borderColor: theme.accent, backgroundColor: theme.surface }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide" style={{ color: theme.accent }}>{theme.motif}</span>
                  <span className="h-6 w-6 rounded-full" style={{ background: "linear-gradient(135deg, " + theme.accent + ", " + theme.secondary + ")" }} />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full w-2/3 rounded-full" style={{ background: "linear-gradient(90deg, " + theme.secondary + ", " + theme.accent + ")" }} />
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
              <div className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-xl" style={{ background: "radial-gradient(circle at 15% 10%, rgba(255,255,255,0.25), transparent 32%), linear-gradient(145deg, " + activePreview.accent + ", " + activePreview.secondary + ")" }}>
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {branding.logoUrl ? (
                      <div className="h-12 w-12 rounded-2xl bg-white/20 bg-cover bg-center ring-1 ring-white/35" style={{ backgroundImage: "url(" + branding.logoUrl + ")" }} />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-sm font-black ring-1 ring-white/35">
                        {businessName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">LoyaltyBase</p>
                      <h3 className="mt-1 text-lg font-bold leading-tight">{businessName}</h3>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white/80 ring-1 ring-white/20">{activePreview.label}</span>
                </div>
                <div className="relative mt-8">
                  <p className="text-sm font-semibold text-white/70">Customer</p>
                  <h4 className="mt-1 text-4xl font-black tracking-tight">Mina Hanna</h4>
                  <span className="mt-4 inline-flex rounded-full bg-white/25 px-3 py-1.5 text-sm font-black ring-1 ring-white/30">SILVER MEMBER</span>
                </div>
                <div className="relative mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="rounded-3xl bg-white/15 p-4 ring-1 ring-white/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Card Number</p>
                    <p className="mt-2 font-mono text-2xl font-black tracking-wide">cst_demo...7821</p>
                  </div>
                  <div className="rounded-[24px] bg-white p-3 text-center shadow-xl">
                    <div className="grid h-32 w-32 grid-cols-5 gap-1 rounded-xl bg-white p-2">
                      {Array.from({ length: 25 }).map((_, index) => (
                        <span key={index} className="rounded-sm" style={{ backgroundColor: index % 3 === 0 ? "#111827" : index % 4 === 0 ? activePreview.accent : "#E5E7EB" }} />
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#64748B]">Sample QR</p>
                  </div>
                </div>
              </div>

              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: branding.textColor }}>Loyalty Progress</p>
                    <h3 className="mt-2 text-xl font-black text-[#1E293B]">Coffee Club</h3>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: activePreview.accent + "1A", color: activePreview.accent }}>3 left</span>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <p className="text-5xl font-black" style={{ color: activePreview.accent }}>7</p>
                  <p className="pb-2 text-lg font-black text-[#94A3B8]">/10</p>
                </div>
                <div className="mt-3 h-4 overflow-hidden rounded-full" style={{ backgroundColor: activePreview.secondary + "2E" }}>
                  <div className="h-full w-[70%] rounded-full" style={{ background: "linear-gradient(90deg, " + activePreview.secondary + ", " + activePreview.accent + ")" }} />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#64748B]">Next reward: Free Coffee</p>
              </section>

              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide" style={{ color: activePreview.accent }}>Referral Code</p>
                <p className="mt-2 font-mono text-lg font-black text-[#1E293B]">RAW-MINA82</p>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Sample referral section shown for preview only. No customer data is created.</p>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
