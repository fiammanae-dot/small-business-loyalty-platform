import type { CustomerTierCriteria } from "@prisma/client";

export type CustomerTierName = "Bronze" | "Silver" | "Gold" | "VIP";

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
  SPEND_ONLY: "Visits only",
  VISITS_AND_SPEND: "Visits only",
};

const tierOrder: CustomerTierName[] = ["Bronze", "Silver", "Gold", "VIP"];

export function isTierSystemEnabledForPlan(_planName?: string | null) {
  return true;
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
  void spend;
  const tier = resolveTier(visits, normalized);
  const nextTier = getNextTier(tier);
  const currentThreshold = getTierThreshold(tier, normalized);
  const nextThreshold = nextTier ? getTierThreshold(nextTier, normalized) : currentThreshold;
  const currentScore = visits;
  const baselineScore = currentThreshold.visits;
  const nextScore = nextThreshold.visits;
  const progressSpan = Math.max(nextScore - baselineScore, 1);
  const progressInTier = Math.max(currentScore - baselineScore, 0);
  const progressPercent = nextTier ? Math.min(100, Math.round((progressInTier / progressSpan) * 100)) : 100;

  return {
    tier,
    nextTier,
    progressPercent,
    visitsRemaining: nextTier ? Math.max(nextThreshold.visits - visits, 0) : 0,
    spendRemaining: 0,
    isRoyalVip: tier === "VIP",
    isVip: tier === "VIP",
    badgeLabel: `${tier.toUpperCase()} MEMBER`,
    badgeIcon: tier === "VIP" ? "👑" : tier === "Gold" ? "🥇" : tier === "Silver" ? "🥈" : "🥉",
    criteria: "VISITS_ONLY" as CustomerTierCriteria,
  };
}

function resolveTier(visits: number, config: CustomerTierConfig): CustomerTierName {
  if (meetsThreshold(visits, config, "VIP")) return "VIP";
  if (meetsThreshold(visits, config, "Gold")) return "Gold";
  if (meetsThreshold(visits, config, "Silver")) return "Silver";
  return "Bronze";
}

function meetsThreshold(visits: number, config: CustomerTierConfig, tier: CustomerTierName) {
  const threshold = getTierThreshold(tier, config);
  return visits >= threshold.visits;
}

function getNextTier(tier: CustomerTierName) {
  return tierOrder[tierOrder.indexOf(tier) + 1] ?? null;
}

function getTierThreshold(tier: CustomerTierName, config: CustomerTierConfig) {
  if (tier === "VIP") return { visits: config.royalVipVisits, spend: 0 };
  if (tier === "Gold") return { visits: config.eliteVisits, spend: 0 };
  if (tier === "Silver") return { visits: config.premiumVisits, spend: 0 };
  return { visits: 0, spend: 0 };
}
