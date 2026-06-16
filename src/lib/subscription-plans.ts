import type { BillingCycle, SubscriptionPlan } from "@prisma/client";

export const includedPlanCapabilities = [
  "Customers",
  "Programs",
  "Branches",
  "Users / Staff",
  "Referrals",
  "Customer Tiers",
  "Reports",
  "CSV Exports",
  "Branding",
] as const;

export type PlanCode = "STARTER" | "GROWTH" | "MULTI_BRANCH";

export type PlanCycle = Extract<BillingCycle, "MONTHLY" | "YEARLY">;

export function normalizePlanCode(value: string): PlanCode | null {
  if (value === "STARTER" || value === "GROWTH" || value === "MULTI_BRANCH") {
    return value;
  }

  return null;
}

export function getBillingCycleSupport(plan: Pick<SubscriptionPlan, "billingCycleSupport">): PlanCycle[] {
  const raw = plan.billingCycleSupport;
  if (!Array.isArray(raw)) {
    return ["YEARLY"];
  }

  const supported = raw.filter((item): item is PlanCycle => item === "MONTHLY" || item === "YEARLY");
  return supported.length > 0 ? supported : ["YEARLY"];
}

export function isBillingCycleSupported(plan: Pick<SubscriptionPlan, "billingCycleSupport">, cycle: BillingCycle) {
  return getBillingCycleSupport(plan).includes(cycle as PlanCycle);
}

export function getSubscriptionPeriodEnd(start: Date, cycle: BillingCycle) {
  const end = new Date(start);
  if (cycle === "MONTHLY") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }

  return end;
}

export function formatBillingCycle(cycle: BillingCycle) {
  return cycle === "MONTHLY" ? "Monthly" : "Yearly";
}

export function formatPlanPrice(plan: { code: string; monthlyPrice: number | string | { toString(): string }; annualPrice: number | string | { toString(): string } }) {
  if (plan.code === "MULTI_BRANCH") {
    return `AED ${Number(plan.annualPrice).toFixed(0)}/year per branch`;
  }

  return `AED ${Number(plan.monthlyPrice).toFixed(0)}/month · AED ${Number(plan.annualPrice).toFixed(0)}/year`;
}
