"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ProgramMilestonesField, type MilestoneDraft } from "@/components/ProgramMilestonesField";
import { WalletCardPictureField } from "@/components/WalletCardPictureField";
import type { BusinessType, CardTheme, StartingStampPolicy } from "@prisma/client";
import type { CardDesignLayoutStyle, CardDesignStampIcon } from "@/lib/card-design";
import { buildProgramPassView, walletColourLayoutStyle, walletPreviewDesign } from "@/lib/wallet-pass-view";
import { Button, RequiredMark, SectionCard } from "@/components/ui";
import { CardColourPicker } from "@/components/wallet-pass/CardColourPicker";
import { StampIconChooser } from "@/components/wallet-pass/StampIconChooser";
import { WalletPassPreview } from "@/components/wallet-pass/WalletPassPreview";
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
  stampEmoji?: string | null;
  walletHeroStyle?: "STAMPS" | "PHOTO" | null;
  walletPhotoUrl?: string | null;
  rewardName?: string;
  rewardDescription?: string;
  /** Rewards before the card is full, earliest first. */
  milestones?: MilestoneDraft[];
  active?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
};

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
  membershipsEnabled,
  lockedType,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults: ProgramDefaults;
  submitLabel: string;
  businessName: string;
  branding: ProgramPreviewBranding;
  csrfName: string;
  csrfToken: string;
  /** The parts of a design a wallet pass can show: a colour and a stamp icon. */
  initialDesign: {
    layoutStyle: CardDesignLayoutStyle;
    stampIcon: CardDesignStampIcon;
  };
  stampIconOptions: Array<{ value: CardDesignStampIcon; label: string; recommended: boolean }>;
  membershipsEnabled?: boolean;
  lockedType?: "stamp" | "membership";
}) {
  const wizardRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [layoutStyle, setLayoutStyle] = useState<CardDesignLayoutStyle>(walletColourLayoutStyle(initialDesign.layoutStyle));
  const [stampIcon, setStampIcon] = useState<CardDesignStampIcon>(initialDesign.stampIcon);
  // What step 1 says about the card, read when the owner moves to the design
  // step so the preview shows their real name, visit count and picture.
  const [cardSetup, setCardSetup] = useState<{ name: string; requiredStamps: number; walletHeroStyle: string; walletPhotoUrl: string }>({
    name: defaults.name ?? "",
    requiredStamps: defaults.requiredStamps ?? 1,
    walletHeroStyle: defaults.walletHeroStyle ?? "STAMPS",
    walletPhotoUrl: defaults.walletPhotoUrl ?? "",
  });
  const [isMembership, setIsMembership] = useState(lockedType === "membership");

  const name = defaults.name ?? "";
  const productOrServiceName = defaults.productOrServiceName ?? "";
  const requiredStamps = defaults.requiredStamps ?? 1;
  const startingBonusStamps = defaults.startingBonusStamps ?? 0;
  const startingStampPolicy = defaults.startingStampPolicy ?? "FIRST_ENROLLMENT_ONLY";
  const referralRewardBonusStamps = defaults.referralRewardBonusStamps ?? 1;
  const rewardName = defaults.rewardName ?? "";
  const rewardDescription = defaults.rewardDescription ?? "";
  const previewView = useMemo(() => {
    const total = Math.max(1, cardSetup.requiredStamps || 1);
    const sampleProgress = Math.max(1, Math.round(total * 0.6));
    return buildProgramPassView({
      businessName,
      logoUrl: branding.logoUrl,
      branding,
      program: {
        name: cardSetup.name.trim() || (isMembership ? "Membership" : "Loyalty card"),
        isMembership,
        requiredStamps: total,
        cardDesign: walletPreviewDesign(layoutStyle, stampIcon),
        walletHeroStyle: cardSetup.walletHeroStyle,
        photoUrl: cardSetup.walletPhotoUrl || null,
      },
      customerName: "Mina Hanna",
      progress: sampleProgress,
      membership: isMembership ? { remaining: Math.max(0, total - 1), total } : null,
      reward: { ready: false, visitsToNext: Math.max(0, total - sampleProgress) },
    });
  }, [branding, businessName, cardSetup, isMembership, layoutStyle, stampIcon]);

  function goToStep(nextStep: 1 | 2) {
    if (nextStep === 2 && wizardRef.current) {
      const form = new FormData(wizardRef.current);
      const read = (field: string) => String(form.get(field) ?? "");
      setCardSetup({
        name: read("name"),
        requiredStamps: Number(read("requiredStamps")) || 1,
        walletHeroStyle: read("walletHeroStyle") || "STAMPS",
        walletPhotoUrl: read("walletPhotoUrl"),
      });
    }
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
      <input type="hidden" name="stampIcon" value={stampIcon} />

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

        {membershipsEnabled && !lockedType ? (
          <SectionCard title="Program type" description="Choose how this card works.">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsMembership(false)}
                data-active={!isMembership}
                className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-left transition hover:border-[var(--business-primary)] data-[active=true]:border-[var(--business-primary)] data-[active=true]:ring-2 data-[active=true]:ring-[var(--business-primary)]/20"
              >
                <span className="block text-sm font-bold text-[#111827]">Collect stamps &rarr; reward</span>
                <span className="mt-1 block text-sm text-[#6B7280]">Customers earn a stamp each visit and get a reward when the card is full.</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMembership(true)}
                data-active={isMembership}
                className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-left transition hover:border-[var(--business-primary)] data-[active=true]:border-[var(--business-primary)] data-[active=true]:ring-2 data-[active=true]:ring-[var(--business-primary)]/20"
              >
                <span className="block text-sm font-bold text-[#111827]">Membership &mdash; prepaid visits</span>
                <span className="mt-1 block text-sm text-[#6B7280]">Customer pays once for a card of prepaid services. Each visit uses one and the card counts down.</span>
              </button>
            </div>
          </SectionCard>
        ) : null}
        <input type="hidden" name="isMembership" value={isMembership ? "true" : "false"} />

        <SectionCard
          title={isMembership ? "Included visits" : "Stamps"}
          description={isMembership ? "How many prepaid visits this membership includes. Each visit uses one." : "How many stamps a customer collects to complete the card."}
        >
          <Input
            name="requiredStamps"
            label={isMembership ? "Number of included visits" : "Required stamps"}
            type="number"
            min="1"
            defaultValue={requiredStamps.toString()}
            required
          />
        </SectionCard>

        {isMembership ? (
          <SectionCard title="Membership details" description="The one-time price, the treatments the customer can choose from, and member perks.">
            <div className="grid gap-4">
              <Input name="priceAmount" label="Membership price (AED)" type="number" min="0" defaultValue="" required />
              <MembershipServicesField />
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#111827]">Member perks</span>
                <span className="text-xs text-[#6B7280]">Optional. One perk per line.</span>
                <textarea name="membershipBenefits" rows={4} placeholder="Priority booking&#10;Exclusive member pricing&#10;Complimentary consultation" className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
              </label>
            </div>
          </SectionCard>
        ) : null}

      <SectionCard
        title="Picture on the wallet card"
        description="Google Wallet shows one picture on the card. Choose the stamps or your own photo."
      >
        <WalletCardPictureField
          defaultHeroStyle={defaults.walletHeroStyle}
          defaultPhotoUrl={defaults.walletPhotoUrl}
        />
      </SectionCard>

        {!isMembership ? (
          <>
            <SectionCard title="Reward" description="Define the reward customers receive when they complete the program.">
              <div className="grid gap-4 md:grid-cols-2">
                <Input name="rewardName" label="Reward Name" defaultValue={rewardName} required />
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-[#111827]">
                    Reward Description
                    <RequiredMark />
                  </span>
                  <textarea name="rewardDescription" rows={3} defaultValue={rewardDescription} required className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Rewards before the card is full"
              description="Optional. A reward partway through gives customers a reason to come back before they finish."
            >
              <ProgramMilestonesField
                initialMilestones={defaults.milestones ?? []}
                requiredStamps={requiredStamps}
              />
            </SectionCard>
          </>
        ) : null}

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

        {!isMembership ? (
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
        ) : null}

      </div>

      <div className={step === 2 ? "grid gap-6" : "hidden"}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
          <div className="grid gap-5">
            <p className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              Apple and Google Wallet draw every pass with one colour, your logo, one picture and a few lines of text, so the card is designed with
              a colour and a stamp icon. The same card is shown in the wallet and on the web card link.
            </p>
            <SectionCard title="Card colour" description="The background of the pass. Brand colour follows your Business Branding settings.">
              <CardColourPicker value={layoutStyle} onChange={setLayoutStyle} branding={branding} mode="layoutStyle" />
            </SectionCard>
            <SectionCard title="Stamp icon" description="Drawn once per visit in the picture on the card. Recommended icons come first.">
              <StampIconChooser options={stampIconOptions} value={stampIcon} onChange={setStampIcon} />
            </SectionCard>
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-6">
            <SectionCard title="Live Preview" description="A sample customer partway through the card.">
              <WalletPassPreview view={previewView} />
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
      <span className="text-sm font-medium text-[#111827]">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
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

function formatInputDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function MembershipServicesField() {
  const [services, setServices] = useState<string[]>([""]);

  const updateService = (index: number, value: string) =>
    setServices((current) => current.map((service, i) => (i === index ? value : service)));
  const addService = () => setServices((current) => [...current, ""]);
  const removeService = (index: number) =>
    setServices((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-[#111827]">Included treatments<RequiredMark /></span>
      <span className="text-xs text-[#6B7280]">Add each treatment the customer can choose from. Staff pick which one was done at each visit.</span>
      <div className="grid gap-2">
        {services.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              name="membershipTreatments"
              value={value}
              onChange={(event) => updateService(index, event.target.value)}
              placeholder={index === 0 ? "e.g. Hydrafacial" : "Add another treatment"}
              className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0"
            />
            {services.length > 1 ? (
              <button
                type="button"
                onClick={() => removeService(index)}
                aria-label="Remove treatment"
                className="h-11 shrink-0 rounded-md border border-[#E5E7EB] px-3 text-sm text-[#6B7280] transition hover:bg-[#F9FAFB]"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addService}
        className="w-fit rounded-md border border-dashed border-[var(--business-primary)] px-3 py-2 text-sm font-semibold text-[var(--business-primary)] transition hover:bg-[var(--business-primary-soft)]"
      >
        + Add service
      </button>
    </div>
  );
}
