"use client";

import { useState, type ReactNode } from "react";

export type PackageRulesDefaults = {
  packageValidity: "LIFETIME" | "MONTHLY_FORFEIT" | "FIXED_TERM";
  packageTermMonths: number | null;
  packageOneVisitPerMonth: boolean;
  packageUniqueTreatments: boolean;
};

/** Today's behaviour, used for new packages unless the owner changes it. */
export const DEFAULT_PACKAGE_RULES: PackageRulesDefaults = {
  packageValidity: "MONTHLY_FORFEIT",
  packageTermMonths: null,
  packageOneVisitPerMonth: false,
  packageUniqueTreatments: false,
};

/**
 * The owner's package rules: does it expire (and how), can the customer come
 * twice in one month, and can a treatment be repeated. Plain radio inputs, so
 * the values post with the surrounding form; state only shows/hides the
 * follow-up questions.
 */
export function PackageRulesFields({ defaults = DEFAULT_PACKAGE_RULES }: { defaults?: PackageRulesDefaults }) {
  const [lifetime, setLifetime] = useState(defaults.packageValidity === "LIFETIME" ? "lifetime" : "expiry");
  const [expiryRule, setExpiryRule] = useState(defaults.packageValidity === "FIXED_TERM" ? "FIXED_TERM" : "MONTHLY_FORFEIT");

  return (
    <div className="grid gap-5">
      <Question title="How long can the customer use the package?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="packageLifetime" value="lifetime" checked={lifetime === "lifetime"} onChange={() => setLifetime("lifetime")} title="Lifetime" description="Visits never expire." />
          <Choice name="packageLifetime" value="expiry" checked={lifetime === "expiry"} onChange={() => setLifetime("expiry")} title="With expiry" description="Unused visits expire by a rule you choose." />
        </div>
        {lifetime === "expiry" ? (
          <div className="mt-3 grid gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Expiry rule</p>
            <Choice
              name="packageExpiryRule"
              value="MONTHLY_FORFEIT"
              checked={expiryRule === "MONTHLY_FORFEIT"}
              onChange={() => setExpiryRule("MONTHLY_FORFEIT")}
              title="Lose 1 visit for each month without a visit"
              description="Months run from the join date. A month with no visit loses one visit."
            />
            <Choice
              name="packageExpiryRule"
              value="FIXED_TERM"
              checked={expiryRule === "FIXED_TERM"}
              onChange={() => setExpiryRule("FIXED_TERM")}
              title="All visits expire after a set time"
              description="Whatever is left is lost on the end date."
            />
            {expiryRule === "FIXED_TERM" ? (
              <label className="mt-1 grid max-w-xs gap-1 text-sm font-medium text-[#111827]">
                Months from joining
                <input
                  name="packageTermMonths"
                  type="number"
                  min={1}
                  max={60}
                  required
                  defaultValue={defaults.packageTermMonths ?? 6}
                  className="h-11 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none business-ring focus:ring-0"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </Question>

      <Question title="Can the customer use two visits in the same month?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="packageVisitsPerMonth" value="many" defaultChecked={!defaults.packageOneVisitPerMonth} title="Yes, allow it" description="No limit per month." />
          <Choice name="packageVisitsPerMonth" value="one" defaultChecked={defaults.packageOneVisitPerMonth} title="No, one visit a month" description="Staff are blocked; an owner or manager can override with a reason." />
        </div>
      </Question>

      <Question title="Can the same treatment be used more than once?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="packageTreatments" value="repeat" defaultChecked={!defaults.packageUniqueTreatments} title="Yes, repeats allowed" description="Any treatment on the list, any visit." />
          <Choice name="packageTreatments" value="once" defaultChecked={defaults.packageUniqueTreatments} title="No, only one of each" description="Each treatment on the list can be used once per package." />
        </div>
      </Question>
    </div>
  );
}

function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-semibold text-[#111827]">{title}</legend>
      {children}
    </fieldset>
  );
}

function Choice({
  name,
  value,
  title,
  description,
  checked,
  defaultChecked,
  onChange,
}: {
  name: string;
  value: string;
  title: string;
  description: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 transition has-[:checked]:border-[var(--business-primary)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--business-primary)]/20">
      <input
        type="radio"
        name={name}
        value={value}
        required
        {...(checked !== undefined ? { checked, onChange } : { defaultChecked })}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--business-primary)]"
      />
      <span>
        <span className="block text-sm font-semibold text-[#111827]">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-[#6B7280]">{description}</span>
      </span>
    </label>
  );
}
