import "server-only";
import { STAMP_ICONS } from "@/lib/wallet/stamp-icons";
import { businessTypeValues } from "@/lib/roles";

import { z } from "zod";
import type { BusinessType, StartingStampPolicy } from "@prisma/client";

export const startingStampPolicyValues = ["NEVER", "FIRST_ENROLLMENT_ONLY", "EVERY_COMPLETED_CARD"] as const;

export type StartingStampPolicyEvent = "INITIAL_ENROLLMENT" | "CARD_RESET";

export function getStartingBonusStampsForEvent({
  startingBonusStamps,
  startingStampPolicy,
  event,
}: {
  startingBonusStamps: number;
  startingStampPolicy: StartingStampPolicy;
  event: StartingStampPolicyEvent;
}) {
  if (startingStampPolicy === "NEVER") return 0;
  if (event === "INITIAL_ENROLLMENT") return startingBonusStamps;
  if (startingStampPolicy === "EVERY_COMPLETED_CARD") return startingBonusStamps;
  return 0;
}

export function startingStampPolicyLabel(policy: StartingStampPolicy) {
  if (policy === "NEVER") return "Never";
  if (policy === "EVERY_COMPLETED_CARD") return "Every completed card";
  return "Only on first enrollment";
}

export const programTemplates: Record<
  Exclude<BusinessType, "OTHER">,
  {
    name: string;
    productOrServiceName: string;
    requiredStamps: number;
    startingBonusStamps: number;
    rewardName: string;
    rewardDescription: string;
  }
> = {
  COFFEE_SHOP: {
    name: "Coffee Club",
    productOrServiceName: "Coffee",
    requiredStamps: 12,
    startingBonusStamps: 2,
    rewardName: "Free Coffee",
    rewardDescription: "A free coffee after completing the card.",
  },
  RESTAURANT: {
    name: "Meal Rewards",
    productOrServiceName: "Meal",
    requiredStamps: 10,
    startingBonusStamps: 0,
    rewardName: "Free Meal",
    rewardDescription: "A free meal after completing the card.",
  },
  BARBERSHOP: {
    name: "Haircut Club",
    productOrServiceName: "Haircut",
    requiredStamps: 11,
    startingBonusStamps: 1,
    rewardName: "Free Haircut",
    rewardDescription: "A free haircut after completing the card.",
  },
  BEAUTY_SALON: {
    name: "Beauty Rewards",
    productOrServiceName: "Treatment",
    requiredStamps: 7,
    startingBonusStamps: 2,
    rewardName: "Free Treatment",
    rewardDescription: "A free treatment after completing the card.",
  },
  CAR_CARE_CENTER: {
    name: "Wash Club",
    productOrServiceName: "Car wash",
    requiredStamps: 7,
    startingBonusStamps: 2,
    rewardName: "Free Wash",
    rewardDescription: "A free wash after completing the card.",
  },
  // A clinic package is the other way round from a coffee card: the customer
  // has already paid for the sessions, so the card counts down what they have
  // left rather than earning them something free. That is why this one starts
  // at zero - starting stamps here would be sessions the clinic gives away.
  AESTHETIC_CLINIC: {
    name: "Treatment Package",
    productOrServiceName: "Session",
    requiredStamps: 6,
    startingBonusStamps: 0,
    rewardName: "Complimentary Session",
    rewardDescription: "A complimentary session once the package is complete.",
  },
};

export const programSchema = z
  .object({
    name: z.string().trim().min(1, "Program name is required."),
    businessType: z.enum(businessTypeValues),
    productOrServiceName: z.string().trim().min(1, "Product or service name is required."),
    description: z.string().trim().optional(),
    requiredStamps: z.coerce.number().int().min(1, "Required stamps must be at least 1."),
    startingBonusStamps: z.coerce.number().int().min(0, "Starting stamps cannot be negative."),
    startingStampPolicy: z.enum(startingStampPolicyValues).default("FIRST_ENROLLMENT_ONLY"),
    referralRewardBonusStamps: z.coerce.number().int().min(0, "Referral reward bonus stamps cannot be negative."),
    cardTheme: z.enum(["BUSINESS_DEFAULT", "COFFEE_CAFE", "RESTAURANT", "BEAUTY_SALON", "AUTOMOTIVE", "RETAIL_GENERAL"]).default("BUSINESS_DEFAULT"),
    // Only an icon we ship artwork for is stored; anything else becomes null and
    // the card falls back to a plain tick rather than drawing nothing.
    stampEmoji: z
      .string()
      .trim()
      .nullish()
      .transform((value) => (value && STAMP_ICONS.some((icon) => icon.emoji === value) ? value : null)),
    // Google Wallet shows one picture on the card: the stamps or the business's
    // own photo. PHOTO with no photo stored falls back to the stamps rather
    // than leaving the slot empty.
    walletHeroStyle: z.enum(["STAMPS", "PHOTO"]).default("STAMPS"),
    walletPhotoUrl: z
      .string()
      .trim()
      .nullish()
      .transform((value) => (value && /^https:\/\//i.test(value) ? value : null)),
    rewardName: z.string().trim().min(1, "Reward name is required."),
    rewardDescription: z.string().trim().min(1, "Reward description is required."),
    active: z.boolean(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
  })
  .refine((data) => data.startingBonusStamps <= data.requiredStamps, {
    message: "Starting stamps cannot exceed required stamps.",
    path: ["startingBonusStamps"],
  })
  .refine((data) => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate), {
    message: "End date must be after start date.",
    path: ["endDate"],
  });

export function parseProgramDate(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function progressValue(earnedStamps: number, bonusStamps: number) {
  return earnedStamps + bonusStamps;
}

export function programStatusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export function programCustomerStatusLabel({
  status,
  earnedStamps,
  bonusStamps,
  requiredStamps,
}: {
  status: string;
  earnedStamps: number;
  bonusStamps: number;
  requiredStamps: number;
}) {
  if (status === "COMPLETED") return "Completed";
  if (progressValue(earnedStamps, bonusStamps) >= requiredStamps) return "Reward Ready";
  return "Active";
}

