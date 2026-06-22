import type { BusinessType, CardTheme } from "@prisma/client";
import { CsrfInput } from "@/components/CsrfInput";
import { businessTypeOptions } from "@/lib/platform-options";
import { cardThemeOptions } from "@/lib/card-themes";
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
  const cardTheme = defaults.cardTheme ?? "BUSINESS_DEFAULT";

  return (
    <form action={action} className="grid gap-5">
      <CsrfInput scope="dashboard:programs" />
      {defaults.uuid ? <input type="hidden" name="programUuid" value={defaults.uuid} /> : null}
      <div className="rounded-md border business-border-soft business-bg-soft p-4">
        <p className="text-sm font-semibold business-text">Template loaded</p>
        <p className="mt-1 text-sm text-[#6B7280]">Defaults are editable before saving.</p>
      </div>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-[#111827]">Loyalty card theme</p>
          <p className="text-sm text-[#6B7280]">Choose how the public customer card should feel. Custom theme editing is reserved for a future release.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cardThemeOptions.map((theme) => (
            <label key={theme.value} className="group cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white p-3 transition hover:border-[var(--business-primary,#F97316)] hover:bg-[var(--business-primary-soft,#FFF7ED)]">
              <input type="radio" name="cardTheme" value={theme.value} defaultChecked={cardTheme === theme.value} className="sr-only peer" />
              <div className="rounded-xl border p-3 peer-checked:ring-2 peer-checked:ring-[var(--business-primary,#F97316)]" style={{ borderColor: theme.accent, backgroundColor: theme.surface }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide" style={{ color: theme.accent }}>{theme.motif}</span>
                  <span className="h-6 w-6 rounded-full" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.secondary})` }} />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full w-2/3 rounded-full" style={{ background: `linear-gradient(90deg, ${theme.secondary}, ${theme.accent})` }} />
                </div>
              </div>
              <span className="mt-3 block text-sm font-bold text-[#111827]">{theme.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{theme.description}</span>
            </label>
          ))}
        </div>
      </section>

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
        <textarea name="description" rows={3} defaultValue={defaults.description ?? ""} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[#111827]">Reward Description</span>
        <textarea name="rewardDescription" rows={3} defaultValue={rewardDescription} required className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
      </label>
      <button type="submit" className="w-fit rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
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
      <input name={name} type={type} min={min} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
    </label>
  );
}

function formatInputDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
