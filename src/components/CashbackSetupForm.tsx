"use client";

import { useRef, useState } from "react";
import type { CardTheme } from "@prisma/client";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, SectionCard } from "@/components/ui";
import { saveCashbackSettingsAction } from "@/app/dashboard/actions";
import { CardThemePreviewSelector } from "@/components/CardThemePreviewSelector";
import { CashbackPhotoField } from "@/components/CashbackPhotoField";

type PreviewBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  logoUrl: string | null;
};

/**
 * Cashback presented as a real program, with the same two-step flow stamp and
 * membership programs use: step 1 is the rules (rate and caps), step 2 is the
 * card design (wallet style + picture). Both steps stay mounted so every field
 * is submitted together. Cashback is still a business-wide feature, so this
 * writes the same BusinessCashbackSettings via saveCashbackSettingsAction; the
 * CSRF token is minted on the server and passed in. The card-design fields only
 * post from here, so the plain Settings cashback form never overwrites them.
 */
export function CashbackSetupForm({
  enabled,
  rate,
  maxBill,
  maxRedemption,
  name,
  cardTheme,
  walletPhotoUrl,
  businessName,
  branding,
  csrfName,
  csrfToken,
}: {
  enabled: boolean;
  rate: string;
  maxBill: string;
  maxRedemption: string;
  name: string;
  cardTheme: CardTheme;
  walletPhotoUrl: string | null;
  businessName: string;
  branding: PreviewBranding;
  csrfName: string;
  csrfToken: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  function goToStep(next: 1 | 2) {
    setStep(next);
    requestAnimationFrame(() => stepHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <form action={saveCashbackSettingsAction} className="grid gap-6">
      <input type="hidden" name={csrfName} value={csrfToken} />
      <input type="hidden" name="redirectTo" value="/dashboard/programs" />

      <WizardProgress step={step} />
      <div className="scroll-mt-24 outline-none" tabIndex={-1}>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Step {step} of 2</p>
        <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-2xl font-black text-[#111827] outline-none">
          {step === 1 ? "Program Setup" : "Card design"}
        </h2>
      </div>

      <div className={step === 1 ? "grid gap-5" : "hidden"}>
        <SectionCard title="Program Setup" description="Set the cashback rules before choosing how the customer card looks.">
          <div className="grid gap-4">
            <label className="flex items-center justify-between gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
              <span>
                <span className="block text-sm font-semibold text-[#111827]">Enable cashback</span>
                <span className="mt-1 block text-sm text-[#6B7280]">Let staff add a cashback balance to customers after a payment, which they spend on future visits.</span>
              </span>
              <input type="checkbox" name="enabled" defaultChecked={enabled} className="h-5 w-5 rounded border-[#E5E7EB] business-primary" aria-label="Enable cashback" />
            </label>
            <Field name="name" label="Program name" type="text" defaultValue={name} placeholder="Cashback Rewards" />
            <Field name="ratePercent" label="Cashback rate (% of amount paid)" type="number" min="0" max="100" defaultValue={rate} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="maxBillAmount" label="Max amount paid per transaction (blank = no limit)" type="number" min="0" defaultValue={maxBill} />
              <Field name="maxRedemption" label="Max redemption per transaction (blank = no limit)" type="number" min="0" defaultValue={maxRedemption} />
            </div>
            <p className="text-xs text-[#6B7280]">Per-transaction limits apply to staff at the counter. Leave blank for no limit. Cashback runs business-wide and layers on top of any stamp or membership programs.</p>
          </div>
        </SectionCard>
      </div>

      <div className={step === 2 ? "grid gap-6" : "hidden"}>
        <CardThemePreviewSelector selectedTheme={cardTheme} businessName={businessName} branding={branding} />
        <SectionCard title="Card picture" description="An optional photo at the top of the cashback card. Leave blank for a clean card that just shows the balance.">
          <CashbackPhotoField defaultPhotoUrl={walletPhotoUrl} />
        </SectionCard>
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-between gap-3 border-t border-[#E5E7EB] bg-white/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {step === 1 ? (
          <>
            <span className="hidden text-xs text-[#9CA3AF] sm:block">Nothing is saved until you finish card design.</span>
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
              Save cashback
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function Field({ label, name, type = "text", defaultValue, min, max, placeholder }: { label: string; name: string; type?: string; defaultValue?: string; min?: string; max?: string; placeholder?: string }) {
  return (
    <label className="min-w-0 space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} min={min} max={max} defaultValue={defaultValue} placeholder={placeholder} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring business-border" />
    </label>
  );
}

function WizardProgress({ step }: { step: 1 | 2 }) {
  const steps: Array<{ n: 1 | 2; label: string; sub: string }> = [
    { n: 1, label: "Program setup", sub: "Rules and rate" },
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
