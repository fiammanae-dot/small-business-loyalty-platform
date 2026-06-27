import type { BusinessType, CardTheme } from "@prisma/client";
import { CsrfInput } from "@/components/CsrfInput";
import { businessTypeOptions } from "@/lib/platform-options";
import { CardThemePreviewSelector } from "@/components/CardThemePreviewSelector";
import { Button } from "@/components/ui/Button";
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
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults: ProgramDefaults;
  submitLabel: string;
  businessName: string;
  branding: ProgramPreviewBranding;
}) {
  const template = defaults.businessType !== "OTHER" ? programTemplates[defaults.businessType] : null;
  const name = defaults.name ?? template?.name ?? "";
  const productOrServiceName = defaults.productOrServiceName ?? template?.productOrServiceName ?? "";
  const requiredStamps = defaults.requiredStamps ?? template?.requiredStamps ?? 1;
  const startingBonusStamps = defaults.startingBonusStamps ?? template?.startingBonusStamps ?? 0;
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
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Business Type</span>
            <select name="businessType" defaultValue={defaults.businessType} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
              {businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
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
            <span className="text-sm font-medium text-[#111827]">Reward Description</span>
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

      <SectionCard title="Bonus Visits" description="Set starting and referral bonus stamps without changing reward rules.">
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="startingBonusStamps" label="Starting Bonus Stamps" type="number" min="0" defaultValue={startingBonusStamps.toString()} required />
          <Input name="referralRewardBonusStamps" label="Referral Reward Bonus Stamps" type="number" min="0" defaultValue={referralRewardBonusStamps.toString()} required />
        </div>
      </SectionCard>

      <SectionCard title="Wallet Card Style" description="Choose the visual style customers see on their public loyalty card. This is separate from the business category.">
        <div className="mb-4 rounded-md border business-border-soft business-bg-soft p-4">
          <p className="text-sm font-semibold business-text">Business category and wallet style are separate</p>
          <p className="mt-1 text-sm text-[#6B7280]">Changing this style only affects the visual card design. Rewards, stamps, QR codes, referrals, and tiers stay unchanged.</p>
        </div>
        <CardThemePreviewSelector selectedTheme={cardTheme} businessName={businessName} branding={branding} />
      </SectionCard>

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
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} min={min} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
    </label>
  );
}

function formatInputDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
