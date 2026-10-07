import { CsrfInput } from "@/components/CsrfInput";
import { saveCashbackSettingsAction } from "@/app/dashboard/actions";

/**
 * Cashback setup presented as a "create program" flow. Cashback is a
 * business-wide feature (one configuration per business), so this writes the
 * same BusinessCashbackSettings the Settings page does, via
 * saveCashbackSettingsAction. The hidden redirectTo sends the owner back to
 * Programs after saving instead of Settings.
 */
export function CashbackSetupForm({
  enabled,
  rate,
  maxBill,
  maxRedemption,
}: {
  enabled: boolean;
  rate: string;
  maxBill: string;
  maxRedemption: string;
}) {
  return (
    <form action={saveCashbackSettingsAction} className="grid gap-4">
      <CsrfInput scope="dashboard:cashback-settings" />
      <input type="hidden" name="redirectTo" value="/dashboard/programs" />
      <label className="flex items-center justify-between gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
        <span>
          <span className="block text-sm font-semibold text-[#111827]">Enable cashback</span>
          <span className="mt-1 block text-sm text-[#6B7280]">Let staff add a cashback balance to customers after a payment, which they spend on future visits.</span>
        </span>
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="h-5 w-5 rounded border-[#E5E7EB] business-primary" aria-label="Enable cashback" />
      </label>
      <Field name="ratePercent" label="Cashback rate (% of amount paid)" type="number" min="0" max="100" defaultValue={rate} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="maxBillAmount" label="Max amount paid per transaction (blank = no limit)" type="number" min="0" defaultValue={maxBill} />
        <Field name="maxRedemption" label="Max redemption per transaction (blank = no limit)" type="number" min="0" defaultValue={maxRedemption} />
      </div>
      <p className="text-xs text-[#6B7280]">Per-transaction limits apply to staff at the counter. Leave blank for no limit. Cashback runs business-wide and layers on top of any stamp or membership programs.</p>
      <button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save cashback</button>
    </form>
  );
}

function Field({ label, name, type = "text", defaultValue, min, max }: { label: string; name: string; type?: string; defaultValue?: string; min?: string; max?: string }) {
  return (
    <label className="min-w-0 space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} min={min} max={max} defaultValue={defaultValue} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring business-border" />
    </label>
  );
}
