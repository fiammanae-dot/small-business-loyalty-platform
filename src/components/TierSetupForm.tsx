import { CsrfInput } from "@/components/CsrfInput";
import { saveCustomerTierSettingsAction } from "@/app/dashboard/actions";
import { tierMaintenanceModeLabels, tierQualificationWindowLabels, type CustomerTierConfig } from "@/lib/customer-tiers";

/**
 * Tier setup presented as a "create program" flow. Tiers are a business-wide
 * feature (one ladder per business), so this writes the same CustomerTierSetting
 * the Settings page does, via saveCustomerTierSettingsAction. The hidden
 * redirectTo returns the owner to Programs after saving instead of Settings.
 */
export function TierSetupForm({ config }: { config: CustomerTierConfig }) {
  return (
    <form action={saveCustomerTierSettingsAction} className="grid gap-4">
      <CsrfInput scope="dashboard:customer-tiers" />
      <input type="hidden" name="redirectTo" value="/dashboard/programs" />
      <div className="grid gap-4 md:grid-cols-2">
        <Select name="tierQualificationWindow" label="Qualification window" defaultValue={config.tierQualificationWindow} options={Object.entries(tierQualificationWindowLabels)} />
        <Select name="tierMaintenanceMode" label="Maintenance mode" defaultValue={config.tierMaintenanceMode} options={Object.entries(tierMaintenanceModeLabels)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field name="silverVisitRequirement" label="Silver (visits)" defaultValue={String(config.silverVisitRequirement)} />
        <Field name="goldVisitRequirement" label="Gold (visits)" defaultValue={String(config.goldVisitRequirement)} />
        <Field name="vipVisitRequirement" label="VIP (visits)" defaultValue={String(config.vipVisitRequirement)} />
      </div>
      <p className="text-xs text-[#6B7280]">Visit-based: customers reach Silver, Gold and VIP by qualifying visits; everyone starts at Bronze. Tiers run business-wide and layer on top of any stamp or membership programs.</p>
      <button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save tiers</button>
    </form>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="min-w-0 space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type="number" min="1" defaultValue={defaultValue} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring business-border" />
    </label>
  );
}

function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<[string, string]> }) {
  return (
    <label className="min-w-0 space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring business-border">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}
