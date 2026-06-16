import type {
  CustomerTierCriteria,
  CustomerTierMaintenanceMode,
  CustomerTierName as PrismaCustomerTierName,
  CustomerTierQualificationWindow,
} from "@prisma/client";

export type CustomerTierName = "Bronze" | "Silver" | "Gold" | "VIP";

export type CustomerTierConfig = {
  criteria: CustomerTierCriteria;
  tierQualificationWindow: CustomerTierQualificationWindow;
  tierMaintenanceMode: CustomerTierMaintenanceMode;
  silverVisitRequirement: number;
  goldVisitRequirement: number;
  vipVisitRequirement: number;
};

export const defaultCustomerTierConfig: CustomerTierConfig = {
  criteria: "VISITS_ONLY",
  tierQualificationWindow: "DAYS_90",
  tierMaintenanceMode: "DYNAMIC",
  silverVisitRequirement: 5,
  goldVisitRequirement: 15,
  vipVisitRequirement: 30,
};

export const customerTierCriteriaLabels: Record<CustomerTierCriteria, string> = {
  VISITS_ONLY: "Visits only",
};

export const tierQualificationWindowLabels: Record<CustomerTierQualificationWindow, string> = {
  LIFETIME: "Lifetime",
  DAYS_30: "Last 30 days",
  DAYS_60: "Last 60 days",
  DAYS_90: "Last 90 days",
  MONTHS_12: "Last 12 months",
};

export const tierMaintenanceModeLabels: Record<CustomerTierMaintenanceMode, string> = {
  PERMANENT: "Permanent tier",
  DYNAMIC: "Dynamic tier",
};

const tierOrder: CustomerTierName[] = ["Bronze", "Silver", "Gold", "VIP"];
export const tierRank: Record<CustomerTierName, number> = {
  Bronze: 0,
  Silver: 1,
  Gold: 2,
  VIP: 3,
};

export function isTierSystemEnabledForPlan(_planName?: string | null) {
  return true;
}

export function normalizeTierConfig(config?: Partial<CustomerTierConfig> | null): CustomerTierConfig {
  const silver = positiveInt(config?.silverVisitRequirement, defaultCustomerTierConfig.silverVisitRequirement);
  const gold = Math.max(positiveInt(config?.goldVisitRequirement, defaultCustomerTierConfig.goldVisitRequirement), silver + 1);
  const vip = Math.max(positiveInt(config?.vipVisitRequirement, defaultCustomerTierConfig.vipVisitRequirement), gold + 1);

  return {
    criteria: "VISITS_ONLY",
    tierQualificationWindow: config?.tierQualificationWindow ?? defaultCustomerTierConfig.tierQualificationWindow,
    tierMaintenanceMode: config?.tierMaintenanceMode ?? defaultCustomerTierConfig.tierMaintenanceMode,
    silverVisitRequirement: silver,
    goldVisitRequirement: gold,
    vipVisitRequirement: vip,
  };
}

export function calculateCustomerTier({
  visits,
  visitEvents,
  config,
  achievedTier,
  now = new Date(),
}: {
  visits?: number;
  visitEvents?: Array<Date | string>;
  config?: Partial<CustomerTierConfig> | null;
  achievedTier?: CustomerTierName | PrismaCustomerTierName | null;
  now?: Date;
}) {
  const normalized = normalizeTierConfig(config);
  const qualifyingVisits = visitEvents
    ? countQualifyingVisits(visitEvents, normalized.tierQualificationWindow, now)
    : Math.max(visits ?? 0, 0);
  const calculatedTier = resolveTier(qualifyingVisits, normalized);
  const previousTier = fromStoredTier(achievedTier);
  const tier =
    normalized.tierMaintenanceMode === "PERMANENT" && previousTier && tierRank[previousTier] > tierRank[calculatedTier]
      ? previousTier
      : calculatedTier;
  const nextTier = getNextTier(tier);
  const currentThreshold = getTierThreshold(tier, normalized);
  const nextThreshold = nextTier ? getTierThreshold(nextTier, normalized) : currentThreshold;
  const baselineScore = currentThreshold.visits;
  const nextScore = nextThreshold.visits;
  const progressSpan = Math.max(nextScore - baselineScore, 1);
  const progressInTier = Math.max(qualifyingVisits - baselineScore, 0);
  const progressPercent = nextTier ? Math.min(100, Math.round((progressInTier / progressSpan) * 100)) : 100;

  return {
    tier,
    storedTier: toStoredTier(tier),
    nextTier,
    qualifyingVisits,
    progressPercent,
    visitsRemaining: nextTier ? Math.max(nextThreshold.visits - qualifyingVisits, 0) : 0,
    isRoyalVip: tier === "VIP",
    isVip: tier === "VIP",
    badgeLabel: `${tier.toUpperCase()} MEMBER`,
    badgeIcon: tier === "VIP" ? "👑" : tier === "Gold" ? "🥇" : tier === "Silver" ? "🥈" : "🥉",
    criteria: "VISITS_ONLY" as CustomerTierCriteria,
    tierQualificationWindow: normalized.tierQualificationWindow,
    tierMaintenanceMode: normalized.tierMaintenanceMode,
  };
}

export function countQualifyingVisits(
  visitEvents: Array<Date | string>,
  qualificationWindow: CustomerTierQualificationWindow,
  now = new Date(),
) {
  const windowStart = getTierWindowStart(qualificationWindow, now);
  return visitEvents.filter((eventDate) => {
    const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
    return !Number.isNaN(date.getTime()) && (!windowStart || date >= windowStart) && date <= now;
  }).length;
}

export function getTierWindowStart(qualificationWindow: CustomerTierQualificationWindow, now = new Date()) {
  if (qualificationWindow === "LIFETIME") return null;
  const start = new Date(now);
  if (qualificationWindow === "DAYS_30") start.setDate(start.getDate() - 30);
  if (qualificationWindow === "DAYS_60") start.setDate(start.getDate() - 60);
  if (qualificationWindow === "DAYS_90") start.setDate(start.getDate() - 90);
  if (qualificationWindow === "MONTHS_12") start.setMonth(start.getMonth() - 12);
  return start;
}

export function toStoredTier(tier: CustomerTierName): PrismaCustomerTierName {
  if (tier === "VIP") return "VIP";
  return tier.toUpperCase() as PrismaCustomerTierName;
}

export function fromStoredTier(tier?: CustomerTierName | PrismaCustomerTierName | null): CustomerTierName | null {
  if (!tier) return null;
  if (tier === "VIP") return "VIP";
  if (tier === "GOLD" || tier === "Gold") return "Gold";
  if (tier === "SILVER" || tier === "Silver") return "Silver";
  if (tier === "BRONZE" || tier === "Bronze") return "Bronze";
  return null;
}

export function isTierUpgrade(previousTier: CustomerTierName | PrismaCustomerTierName | null | undefined, nextTier: CustomerTierName) {
  const previous = fromStoredTier(previousTier) ?? "Bronze";
  return tierRank[nextTier] > tierRank[previous];
}

function positiveInt(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.trunc(Number(value)) : fallback;
}

function resolveTier(visits: number, config: CustomerTierConfig): CustomerTierName {
  if (visits >= config.vipVisitRequirement) return "VIP";
  if (visits >= config.goldVisitRequirement) return "Gold";
  if (visits >= config.silverVisitRequirement) return "Silver";
  return "Bronze";
}

function getNextTier(tier: CustomerTierName) {
  return tierOrder[tierOrder.indexOf(tier) + 1] ?? null;
}

function getTierThreshold(tier: CustomerTierName, config: CustomerTierConfig) {
  if (tier === "VIP") return { visits: config.vipVisitRequirement };
  if (tier === "Gold") return { visits: config.goldVisitRequirement };
  if (tier === "Silver") return { visits: config.silverVisitRequirement };
  return { visits: 0 };
}
