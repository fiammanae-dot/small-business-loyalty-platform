"use client";

import { useState, type ReactNode } from "react";
import type { ReferralSettingsView } from "@/lib/referral-settings-rules";

type Props = {
  settings: ReferralSettingsView;
  programs: Array<{ id: number; name: string }>;
  cashbackEnabled: boolean;
  currency: string;
  action: (formData: FormData) => void | Promise<void>;
  /** <CsrfInput scope="dashboard:referral-settings" />, rendered by the server page. */
  csrfInput: ReactNode;
};

/**
 * The one referral reward for the business. Whatever program a referred friend
 * uses first, this is what is paid: bonus stamps on one stamp card, or cashback.
 */
export function ReferralRewardSettingsForm({ settings, programs, cashbackEnabled, currency, action, csrfInput }: Props) {
  const [rewardType, setRewardType] = useState(settings.rewardType);
  const noPrograms = programs.length === 0;

  return (
    <form action={action} className="grid gap-4">
      {csrfInput}
      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="sr-only">Referral reward</legend>
        <Option value="STAMPS" current={rewardType} onChange={setRewardType} title="Bonus stamps" description={noPrograms ? "Create a stamp card first." : "Free stamps on one of your stamp cards."} disabled={noPrograms} />
        <Option value="CASHBACK" current={rewardType} onChange={setRewardType} title="Cashback" description={cashbackEnabled ? "Money into the cashback balance." : "Set up the cashback program first."} disabled={!cashbackEnabled} />
        <Option value="NONE" current={rewardType} onChange={setRewardType} title="No reward" description="Referrals are tracked but nothing is paid." />
      </fieldset>

      {rewardType === "STAMPS" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-[#111827] md:col-span-3">
            Stamp card the stamps go to
            <select name="stampProgramId" defaultValue={settings.stampProgramId ?? programs[0]?.id ?? ""} className="h-11 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-[#6B7280]">Customers who are not on this card yet are added to it when the reward is paid. Packages never receive referral stamps.</span>
          </label>
          <NumberField name="referrerStamps" label="Stamps for the referrer" defaultValue={settings.referrerStamps} />
          <NumberField name="friendStamps" label="Welcome stamps for the friend" defaultValue={settings.friendStamps} />
        </div>
      ) : null}

      {rewardType === "CASHBACK" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField name="referrerCashback" label={`Cashback for the referrer (${currency})`} defaultValue={settings.referrerCashback} step="0.01" />
          <NumberField name="friendCashback" label={`Welcome cashback for the friend (${currency})`} defaultValue={settings.friendCashback} step="0.01" />
        </div>
      ) : null}

      <button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">
        Save referral reward
      </button>
    </form>
  );
}

function Option({ value, current, onChange, title, description, disabled }: { value: ReferralSettingsView["rewardType"]; current: string; onChange: (value: ReferralSettingsView["rewardType"]) => void; title: string; description: string; disabled?: boolean }) {
  return (
    <label className={`flex min-h-20 gap-3 rounded-xl border p-4 transition ${current === value ? "border-[var(--business-primary)] business-bg-soft" : "border-[#E5E7EB] bg-white"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[var(--business-primary)]"}`}>
      <input type="radio" name="rewardType" value={value} checked={current === value} onChange={() => onChange(value)} disabled={disabled} className="mt-1 h-4 w-4" />
      <span>
        <span className="block text-sm font-semibold text-[#111827]">{title}</span>
        <span className="mt-1 block text-xs text-[#6B7280]">{description}</span>
      </span>
    </label>
  );
}

function NumberField({ name, label, defaultValue, step = "1" }: { name: string; label: string; defaultValue: number; step?: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#111827]">
      {label}
      <input name={name} type="number" min="0" step={step} defaultValue={defaultValue} className="h-11 rounded-md border border-[#E5E7EB] px-3 text-sm" />
    </label>
  );
}
