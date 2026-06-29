"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { formatPlanPrice } from "@/lib/subscription-plans";

type PlanOption = {
  id: number;
  code: string;
  name: string;
  monthlyPrice: string | number;
  annualPrice: string | number;
  billingCycleSupport: unknown;
};

type PlanBillingCycleFieldsProps = {
  plans: PlanOption[];
  defaultPlanId?: string;
  defaultBillingCycle?: string;
};

export function PlanBillingCycleFields({
  plans,
  defaultPlanId,
  defaultBillingCycle = "YEARLY",
}: PlanBillingCycleFieldsProps) {
  const initialPlanId = defaultPlanId ?? plans[0]?.id.toString() ?? "";
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  useEffect(() => {
    setSelectedPlanId(initialPlanId);
  }, [initialPlanId]);
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id.toString() === selectedPlanId) ?? plans[0],
    [plans, selectedPlanId],
  );
  const supportedCycles = getSupportedCycles(selectedPlan);
  const selectedCycle = supportedCycles.includes(defaultBillingCycle) ? defaultBillingCycle : supportedCycles[0] ?? "YEARLY";

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <SearchableCombobox
        label="Plan"
        name="subscriptionPlanId"
        defaultValue={selectedPlanId}
        placeholder="Search plans"
        required
        options={plans.map((plan) => ({
          value: plan.id.toString(),
          label: plan.name,
          description: formatPlanPrice({
            code: plan.code,
            monthlyPrice: plan.monthlyPrice,
            annualPrice: plan.annualPrice,
          }),
        }))}
        onValueChange={setSelectedPlanId}
      />

      <label className="space-y-2">
        <span className="text-sm font-medium text-[#111827]">Billing cycle</span>
        <select
          key={`${selectedPlan?.id ?? "plan"}-${selectedCycle}`}
          name="billingCycle"
          defaultValue={selectedCycle}
          className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
        >
          {supportedCycles.map((cycle) => (
            <option key={cycle} value={cycle}>
              {cycle === "MONTHLY" ? "Monthly" : "Yearly"}
            </option>
          ))}
        </select>
        {selectedPlan?.code === "MULTI_BRANCH" ? (
          <p className="text-xs text-[#6B7280]">Multi Branch is yearly billing only.</p>
        ) : null}
      </label>
    </div>
  );
}

function getSupportedCycles(plan?: PlanOption) {
  if (!plan || !Array.isArray(plan.billingCycleSupport)) {
    return ["YEARLY"];
  }

  const supported = plan.billingCycleSupport.filter((cycle): cycle is "MONTHLY" | "YEARLY" => cycle === "MONTHLY" || cycle === "YEARLY");
  return supported.length > 0 ? supported : ["YEARLY"];
}
