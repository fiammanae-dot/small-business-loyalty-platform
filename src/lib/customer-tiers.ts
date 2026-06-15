import type { CustomerTierCriteria } from "@prisma/client";

export type CustomerTierName = "Member" | "Premium" | "Elite" | "Royal VIP";

export type CustomerTierConfig = {
  criteria: CustomerTierCriteria;
  premiumVisits: number;
  eliteVisits: number;
  royalVipVisits: number;
  premiumSpend: number;
  eliteSpend: number;
  royalVipSpend: number;
};

export const defaultCustomerTierConfig: CustomerTierConfig = {
  criteria: "VISITS_ONLY",
  premiumVisits: 10,
  eliteVisits: 25,
  royalVipVisits: 50,
  premiumSpend: 0,
  eliteSpend: 0,
  royalVipSpend: 0,
};

export const customerTierCriteriaLabels: Record<CustomerTierCriteria, string> = {
  VISITS_ONLY: "Visits only",
  SPEND_ONLY: "Spend only",
  VISITS_AND_SPEND: "Visits + Spend",
};

const tierOrder: CustomerTierName[] = ["Member", "Premium", "Elite", "Royal VIP"];

export function isTierSystemEnabledForPlan(planName?: string | null) {
  return Boolean(planName && planName.toLowerCase() !== "starter");
}

export function normalizeTierConfig(config?: Partial<CustomerTierConfig> | null): CustomerTierConfig {
  return {
    criteria: config?.criteria ?? defaultCustomerTierConfig.criteria,
    premiumVisits: config?.premiumVisits ?? defaultCustomerTierConfig.premiumVisits,
    eliteVisits: config?.eliteVisits ?? defaultCustomerTierConfig.eliteVisits,
    royalVipVisits: config?.royalVipVisits ?? defaultCustomerTierConfig.royalVipVisits,
    premiumSpend: Number(config?.premiumSpend ?? defaultCustomerTierConfig.premiumSpend),
    eliteSpend: Number(config?.eliteSpend ?? defaultCustomerTierConfig.eliteSpend),
    royalVipSpend: Number(config?.royalVipSpend ?? defaultCustomerTierConfig.royalVipSpend),
  };
}

export function calculateCustomerTier({
  visits,
  spend,
  config,
}: {
  visits: number;
  spend: number;
  config?: Partial<CustomerTierConfig> | null;
}) {
  const normalized = normalizeTierConfig(config);
  const tier = resolveTier(visits, spend, normalized);
  const nextTier = getNextTier(tier);
  const currentThreshold = getTierThreshold(tier, normalized);
  const nextThreshold = nextTier ? getTierThreshold(nextTier, normalized) : currentThreshold;
  const currentScore = getCriterionScore(visits, spend, normalized);
  const baselineScore = getThresholdScore(currentThreshold, normalized);
  const nextScore = getThresholdScore(nextThreshold, normalized);
  const progressSpan = Math.max(nextScore - baselineScore, 1);
  const progressInTier = Math.max(currentScore - baselineScore, 0);
  const progressPercent = nextTier ? Math.min(100, Math.round((progressInTier / progressSpan) * 100)) : 100;

  return {
    tier,
    nextTier,
    progressPercent,
    visitsRemaining: nextTier ? Math.max(nextThreshold.visits - visits, 0) : 0,
    spendRemaining: nextTier ? Math.max(nextThreshold.spend - spend, 0) : 0,
    isRoyalVip: tier === "Royal VIP",
    criteria: normalized.criteria,
  };
}

function resolveTier(visits: number, spend: number, config: CustomerTierConfig): CustomerTierName {
  if (meetsThreshold(visits, spend, config, "Royal VIP")) return "Royal VIP";
  if (meetsThreshold(visits, spend, config, "Elite")) return "Elite";
  if (meetsThreshold(visits, spend, config, "Premium")) return "Premium";
  return "Member";
}

function meetsThreshold(visits: number, spend: number, config: CustomerTierConfig, tier: CustomerTierName) {
  const threshold = getTierThreshold(tier, config);
  if (config.criteria === "VISITS_ONLY") return visits >= threshold.visits;
  if (config.criteria === "SPEND_ONLY") return spend >= threshold.spend;
  return visits >= threshold.visits && spend >= threshold.spend;
}

function getNextTier(tier: CustomerTierName) {
  return tierOrder[tierOrder.indexOf(tier) + 1] ?? null;
}

function getTierThreshold(tier: CustomerTierName, config: CustomerTierConfig) {
  if (tier === "Royal VIP") return { visits: config.royalVipVisits, spend: config.royalVipSpend };
  if (tier === "Elite") return { visits: config.eliteVisits, spend: config.eliteSpend };
  if (tier === "Premium") return { visits: config.premiumVisits, spend: config.premiumSpend };
  return { visits: 0, spend: 0 };
}

function getCriterionScore(visits: number, spend: number, config: CustomerTierConfig) {
  if (config.criteria === "VISITS_ONLY") return visits;
  if (config.criteria === "SPEND_ONLY") return spend;
  return visits + spend;
}

function getThresholdScore(threshold: { visits: number; spend: number }, config: CustomerTierConfig) {
  if (config.criteria === "VISITS_ONLY") return threshold.visits;
  if (config.criteria === "SPEND_ONLY") return threshold.spend;
  return threshold.visits + threshold.spend;
}
