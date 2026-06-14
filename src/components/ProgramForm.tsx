import type { BusinessType } from "@prisma/client";
import { CsrfInput } from "@/components/CsrfInput";
import { businessTypeOptions } from "@/lib/platform-options";
import { programTemplates } from "@/lib/programs";

type ProgramDefaults = {
  uuid?: string;
  name?: string;
  businessType: BusinessType;
  productOrServiceName?: string;
  description?: string | null;
  requiredStamps?: number;
  startingBonusStamps?: number;
  referralRewardBonusStamps?: number;
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
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults: ProgramDefaults;
  submitLabel: string;
}) {
  const template = defaults.businessType !== "OTHER" ? programTemplates[defaults.businessType] : null;
  const name = defaults.name ?? template?.name ?? "";
  const productOrServiceName = defaults.productOrServiceName ?? template?.productOrServiceName ?? "";
  const requiredStamps = defaults.requiredStamps ?? template?.requiredStamps ?? 1;
  const startingBonusStamps = defaults.startingBonusStamps ?? template?.startingBonusStamps ?? 0;
  const referralRewardBonusStamps = defaults.referralRewardBonusStamps ?? 1;
  const rewardName = defaults.rewardName ?? template?.rewardName ?? "";
  const rewardDescription = defaults.rewardDescription ?? template?.rewardDescription ?? "";

  return (
    <form action={action} className="grid gap-5">
      <CsrfInput scope="dashboard:programs" />
      {defaults.uuid ? <input type="hidden" name="programUuid" value={defaults.uuid} /> : null}
      <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
        <p className="text-sm font-semibold text-[#F97316]">Template loaded</p>
        <p className="mt-1 text-sm text-[#6B7280]">Defaults are editable before saving.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="name" label="Program Name" defaultValue={name} required />
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Business Type</span>
          <select name="businessType" defaultValue={defaults.businessType} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
            {businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <Input name="productOrServiceName" label="Product/Service Name" defaultValue={productOrServiceName} required />
        <Input name="rewardName" label="Reward Name" defaultValue={rewardName} required />
        <Input name="requiredStamps" label="Required Stamps" type="number" min="1" defaultValue={requiredStamps.toString()} required />
        <Input name="startingBonusStamps" label="Starting Bonus Stamps" type="number" min="0" defaultValue={startingBonusStamps.toString()} required />
        <Input name="referralRewardBonusStamps" label="Referral Reward Bonus Stamps" type="number" min="0" defaultValue={referralRewardBonusStamps.toString()} required />
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
      <label className="space-y-2">
        <span className="text-sm font-medium text-[#111827]">Description</span>
        <textarea name="description" rows={3} defaultValue={defaults.description ?? ""} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[#111827]">Reward Description</span>
        <textarea name="rewardDescription" rows={3} defaultValue={rewardDescription} required className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
      </label>
      <button type="submit" className="w-fit rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">
        {submitLabel}
      </button>
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
      <input name={name} type={type} min={min} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}

function formatInputDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
