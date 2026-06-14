import { progressValue } from "@/lib/programs";

export type RewardState = "ACTIVE" | "REWARD_READY" | "REDEEMED";

export function rewardStateLabel(state: RewardState) {
  if (state === "REWARD_READY") return "Reward Ready";
  if (state === "REDEEMED") return "Redeemed";
  return "Active";
}

export function getRewardState({
  earnedStamps,
  bonusStamps,
  requiredStamps,
  justRedeemed = false,
}: {
  earnedStamps: number;
  bonusStamps: number;
  requiredStamps: number;
  justRedeemed?: boolean;
}): RewardState {
  if (justRedeemed) return "REDEEMED";
  return progressValue(earnedStamps, bonusStamps) >= requiredStamps ? "REWARD_READY" : "ACTIVE";
}

export function isRewardReady({
  earnedStamps,
  bonusStamps,
  requiredStamps,
}: {
  earnedStamps: number;
  bonusStamps: number;
  requiredStamps: number;
}) {
  return getRewardState({ earnedStamps, bonusStamps, requiredStamps }) === "REWARD_READY";
}
