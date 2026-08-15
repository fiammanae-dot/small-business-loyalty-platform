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

export type TierMaintenanceDecision = {
  nextStoredTier: PrismaCustomerTierName;
  changed: boolean;
  downgraded: boolean;
};

/**
 * Decides what a customer's stored tier should become during the scheduled
 * maintenance sweep, without touching the database.
 *
 * The scan flow only recalculates a tier when the customer shows up, so someone
 * who stops visiting keeps a tier they no longer qualify for. This is the
 * counterpart that runs on a schedule instead.
 *
 * It can only lower a tier or leave it alone. Upgrades stay with the scan flow,
 * which is the path that congratulates the customer - promoting someone here
 * would silently skip that notification.
 *
 * Accepts either raw `visitEvents` (filtered to the window internally) or a
 * `visits` count already restricted to the window, so the caller can aggregate
 * in SQL rather than loading every stamp.
 */
export function decideTierMaintenance({
  currentStoredTier,
  visitEvents,
  visits,
  config,
  now = new Date(),
}: {
  currentStoredTier?: CustomerTierName | PrismaCustomerTierName | null;
  visitEvents?: Array<Date | string>;
  visits?: number;
  config?: Partial<CustomerTierConfig> | null;
  now?: Date;
}): TierMaintenanceDecision {
  const normalized = normalizeTierConfig(config);
  const storedTier = fromStoredTier(currentStoredTier) ?? "Bronze";
  const unchanged: TierMaintenanceDecision = {
    nextStoredTier: toStoredTier(storedTier),
    changed: false,
    downgraded: false,
  };

  // A permanent tier is a promise to the customer and is never revoked.
  if (normalized.tierMaintenanceMode === "PERMANENT") return unchanged;
  // A lifetime visit count only ever grows, so it can never fall below a threshold.
  if (normalized.tierQualificationWindow === "LIFETIME") return unchanged;
  // Bronze is the floor.
  if (tierRank[storedTier] === 0) return unchanged;

  const recalculated = calculateCustomerTier({
    visits,
    visitEvents,
    config: normalized,
    achievedTier: storedTier,
    now,
  });

  if (tierRank[recalculated.tier] >= tierRank[storedTier]) return unchanged;

  // `changed` and `downgraded` agree by construction here; both are reported so
  // callers can express "needs a write" and "lost a tier" separately.
  return { nextStoredTier: recalculated.storedTier, changed: true, downgraded: true };
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

// One definition of how long each rolling window is, so the backward shift that
// opens the window and the forward shift that dates its expiry can never drift
// apart.
const tierWindowOffsets: Record<
  Exclude<CustomerTierQualificationWindow, "LIFETIME">,
  { days: number } | { months: number }
> = {
  DAYS_30: { days: 30 },
  DAYS_60: { days: 60 },
  DAYS_90: { days: 90 },
  MONTHS_12: { months: 12 },
};

function shiftByTierWindow(date: Date, qualificationWindow: CustomerTierQualificationWindow, direction: 1 | -1) {
  if (qualificationWindow === "LIFETIME") return null;
  const offset = tierWindowOffsets[qualificationWindow];
  const shifted = new Date(date);
  if ("days" in offset) shifted.setDate(shifted.getDate() + direction * offset.days);
  else shifted.setMonth(shifted.getMonth() + direction * offset.months);
  return shifted;
}

export function getTierWindowStart(qualificationWindow: CustomerTierQualificationWindow, now = new Date()) {
  return shiftByTierWindow(now, qualificationWindow, -1);
}

export type TierMaintenanceSummary = {
  maintainThreshold: number;
  windowedVisits: number;
  expiresAt: Date | null;
  isPermanent: boolean;
};

/**
 * Describes what it takes to hold on to the tier a customer already has, for
 * the "Maintain / Upgrade" view on their card.
 *
 * The tier engine answers "what have they earned"; this answers "what happens
 * if they stop coming". Pure - it reads nothing and writes nothing.
 */
export function computeTierMaintenance({
  visitEvents,
  config,
  tier,
  now = new Date(),
}: {
  visitEvents?: Array<Date | string>;
  config?: Partial<CustomerTierConfig> | null;
  tier: CustomerTierName | PrismaCustomerTierName;
  now?: Date;
}): TierMaintenanceSummary {
  const normalized = normalizeTierConfig(config);
  const currentTier = fromStoredTier(tier) ?? "Bronze";
  const maintainThreshold = getTierThreshold(currentTier, normalized).visits;
  const events = visitEvents ?? [];

  // A permanent tier is never revoked, and a lifetime count only ever grows -
  // neither can expire.
  const isPermanent =
    normalized.tierMaintenanceMode === "PERMANENT" || normalized.tierQualificationWindow === "LIFETIME";

  return {
    maintainThreshold,
    windowedVisits: countQualifyingVisits(events, normalized.tierQualificationWindow, now),
    expiresAt: resolveTierExpiry({
      events,
      maintainThreshold,
      isPermanent,
      qualificationWindow: normalized.tierQualificationWindow,
      now,
    }),
    isPermanent,
  };
}

/**
 * The date the in-window visit count would fall below the current tier's
 * requirement if the customer never visits again.
 *
 * Sorted newest first, the visit at index `maintainThreshold - 1` is the one
 * currently holding the tier up: the moment it ages out, the count drops by one
 * and lands under the requirement.
 */
function resolveTierExpiry({
  events,
  maintainThreshold,
  isPermanent,
  qualificationWindow,
  now,
}: {
  events: Array<Date | string>;
  maintainThreshold: number;
  isPermanent: boolean;
  qualificationWindow: CustomerTierQualificationWindow;
  now: Date;
}) {
  // Bronze has nothing to hold on to.
  if (isPermanent || maintainThreshold === 0) return null;

  const newestFirst = events
    .map((eventDate) => (eventDate instanceof Date ? eventDate : new Date(eventDate)))
    .filter((date) => !Number.isNaN(date.getTime()) && date <= now)
    .sort((first, second) => second.getTime() - first.getTime());

  const tierHoldingVisit = newestFirst[maintainThreshold - 1];
  if (!tierHoldingVisit) return null;

  const expiresAt = shiftByTierWindow(tierHoldingVisit, qualificationWindow, 1);

  // Already below the requirement: there is no future date to promise.
  return expiresAt && expiresAt > now ? expiresAt : null;
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
