import type { BusinessType, CardTheme, StartingStampPolicy } from "@prisma/client";
import { CsrfInput } from "@/components/CsrfInput";
import { CardThemePreviewSelector } from "@/components/CardThemePreviewSelector";
import { Button } from "@/components/ui/Button";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { SectionCard } from "@/components/ui/SectionCard";
import { programTemplates } from "@/lib/programs";

type ProgramPreviewBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  logoUrl: string | null;
};

type ProgramDefaults = {
  uuid?: string;
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

export function ProgramForm({
  action,
  defaults,
  submitLabel,
  businessName,
  branding,
  showCardThemeSelector = true,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults: ProgramDefaults;
  submitLabel: string;
  businessName: string;
  branding: ProgramPreviewBranding;
  showCardThemeSelector?: boolean;
}) {
  const template = defaults.businessType !== "OTHER" ? programTemplates[defaults.businessType] : null;
  const name = defaults.name ?? template?.name ?? "";
  const productOrServiceName = defaults.productOrServiceName ?? template?.productOrServiceName ?? "";
  const requiredStamps = defaults.requiredStamps ?? template?.requiredStamps ?? 1;
  const startingBonusStamps = defaults.startingBonusStamps ?? template?.startingBonusStamps ?? 0;
  const startingStampPolicy = defaults.startingStampPolicy ?? "FIRST_ENROLLMENT_ONLY";
  const referralRewardBonusStamps = defaults.referralRewardBonusStamps ?? 1;
  const rewardName = defaults.rewardName ?? template?.rewardName ?? "";
  const rewardDescription = defaults.rewardDescription ?? template?.rewardDescription ?? "";
  const cardTheme = defaults.cardTheme ?? "BUSINESS_DEFAULT";

  return (
    <form action={action} className="grid gap-5">
      <CsrfInput scope="dashboard:programs" />
      {defaults.uuid ? <input type="hidden" name="programUuid" value={defaults.uuid} /> : null}

      <SectionCard title="Program Details" description="Name the program and describe what customers earn progress toward.">
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
            <span className="text-sm font-medium text-[#111827]">
              Reward Description
              <RequiredMark />
            </span>
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
              <label className="flex min-h-24 cursor-pointer gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[var(--business-primary)]">
                <input type="radio" name="startingStampPolicy" value="NEVER" defaultChecked={startingStampPolicy === "NEVER"} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block text-sm font-semibold text-[#111827]">Never</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">Customers start each card with 0 starting stamps.</span>
                </span>
              </label>
              <label className="flex min-h-24 cursor-pointer gap-3 rounded-xl border border-[var(--business-primary)] bg-[var(--business-primary-soft)] p-4 transition hover:border-[var(--business-primary)]">
                <input type="radio" name="startingStampPolicy" value="FIRST_ENROLLMENT_ONLY" defaultChecked={startingStampPolicy === "FIRST_ENROLLMENT_ONLY"} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block text-sm font-semibold text-[#111827]">Only on first enrollment <span className="text-xs font-bold business-text">(Recommended)</span></span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">Award starting stamps only when the customer first joins this program.</span>
                </span>
              </label>
              <label className="flex min-h-24 cursor-pointer gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[var(--business-primary)]">
                <input type="radio" name="startingStampPolicy" value="EVERY_COMPLETED_CARD" defaultChecked={startingStampPolicy === "EVERY_COMPLETED_CARD"} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block text-sm font-semibold text-[#111827]">Every completed card</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B7280]">Award starting stamps after enrollment and after each reward reset.</span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      </SectionCard>

      {showCardThemeSelector ? (
        <SectionCard title="Wallet Card Style" description="Choose the visual style customers see on their public loyalty card. This is separate from the business category.">
          <div className="mb-4 rounded-md border business-border-soft business-bg-soft p-4">
            <p className="text-sm font-semibold business-text">Business category and wallet style are separate</p>
            <p className="mt-1 text-sm text-[#6B7280]">Changing this style only affects the visual card design. Rewards, stamps, QR codes, referrals, and tiers stay unchanged.</p>
          </div>
          <CardThemePreviewSelector selectedTheme={cardTheme} businessName={businessName} branding={branding} />
        </SectionCard>
      ) : (
        <input type="hidden" name="cardTheme" value={cardTheme} />
      )}

      <SectionCard title="Save" description="Review the details above before saving this loyalty program.">
        <Button type="submit" variant="business" className="w-fit">
          {submitLabel}
        </Button>
      </SectionCard>
    </form>
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

function formatInputDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
