import { progressValue } from "@/lib/programs";

export type RewardState = "ACTIVE" | "REWARD_READY" | "REDEEMED";

/**
 * A reward at a point on the card.
 *
 * Mirrors the ProgramReward row, but as a plain shape so this module stays
 * usable from anywhere - the card, the scanner, the Wallet mapper - without
 * dragging Prisma types through.
 */
export type CardReward = {
  atStamp: number;
  rewardName: string;
  rewardDescription: string;
  /** Claiming this one resets the card. Exactly one per program. */
  completesCard: boolean;
};

export function rewardStateLabel(state: RewardState) {
  if (state === "REWARD_READY") return "Reward Ready";
  if (state === "REDEEMED") return "Redeemed";
  return "Active";
}

type CardInput = {
  earnedStamps: number;
  bonusStamps: number;
  /** Every reward on this card, in any order. */
  rewards: readonly CardReward[];
  /** atStamp values already claimed on the CURRENT card. */
  claimedRewardStamps?: readonly number[];
};

/** Bonus stamps count toward rewards exactly as earned ones do. */
function progressOf(input: CardInput) {
  return progressValue(input.earnedStamps, input.bonusStamps);
}

/**
 * Every reward the customer has reached and not yet taken on this card,
 * earliest first.
 *
 * Returns a list, not a single reward, because more than one can be waiting:
 * a customer who never claimed the 50% at visit 5 and then reaches visit 9 has
 * two. Staff have to be able to see and pick, which is why this does not
 * silently collapse to "the best one".
 */
export function getReadyRewards(input: CardInput): CardReward[] {
  const progress = progressOf(input);
  const claimed = new Set(input.claimedRewardStamps ?? []);
  return input.rewards
    .filter((reward) => reward.atStamp <= progress && !claimed.has(reward.atStamp))
    .sort((a, b) => a.atStamp - b.atStamp);
}

/**
 * The reward the customer is working toward - the earliest one they have not
 * reached yet. Null once every reward on the card is reached.
 *
 * This is what "3 visits until a free wash" should count down to, and it is
 * why the card and the Wallet pass cannot keep naming the final reward: on a
 * nine-slot card with a milestone at five, a customer on their second visit is
 * three away from the discount, not seven away from the wash.
 */
export function getNextReward(input: CardInput): CardReward | null {
  const progress = progressOf(input);
  const upcoming = input.rewards
    .filter((reward) => reward.atStamp > progress)
    .sort((a, b) => a.atStamp - b.atStamp);
  return upcoming[0] ?? null;
}

/** Visits remaining until the next reward, or null when none is left to reach. */
export function stampsUntilNextReward(input: CardInput): number | null {
  const next = getNextReward(input);
  if (!next) return null;
  return Math.max(0, next.atStamp - progressOf(input));
}

/** The reward whose redemption resets the card. */
export function getCompletingReward(rewards: readonly CardReward[]): CardReward | null {
  return rewards.find((reward) => reward.completesCard) ?? null;
}

export function getRewardState(input: CardInput & { justRedeemed?: boolean }): RewardState {
  if (input.justRedeemed) return "REDEEMED";
  return getReadyRewards(input).length > 0 ? "REWARD_READY" : "ACTIVE";
}

export function isRewardReady(input: CardInput) {
  return getReadyRewards(input).length > 0;
}

/**
 * The reward list for a program that has not been read from program_rewards -
 * one reward, at requiredStamps, completing the card.
 *
 * Migration 0048 backfilled exactly this row for every existing program, so
 * this is not a fallback to different behaviour: it is the same card, built
 * from the columns a caller already had. It keeps call sites that have not yet
 * been taught to load the rewards relation honest about what they are assuming.
 */
export function singleCardReward({
  requiredStamps,
  rewardName,
  rewardDescription = "",
}: {
  requiredStamps: number;
  rewardName: string;
  rewardDescription?: string;
}): CardReward[] {
  return [{ atStamp: Math.max(1, requiredStamps), rewardName, rewardDescription, completesCard: true }];
}
