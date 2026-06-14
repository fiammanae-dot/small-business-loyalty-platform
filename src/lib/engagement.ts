import "server-only";

import type { EngagementEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";

export const engagementEventLabels: Record<EngagementEventType, string> = {
  REWARD_READY: "Reward Ready",
  NEAR_REWARD: "Near Reward",
  BIRTHDAY: "Birthday",
  INACTIVE_30_DAYS: "Inactive 30 Days",
  INACTIVE_60_DAYS: "Inactive 60 Days",
  INACTIVE_90_DAYS: "Inactive 90 Days",
  WELCOME_CUSTOMER: "Welcome Customer",
  REWARD_REDEEMED: "Reward Redeemed",
};

export const operationalEngagementTypes: EngagementEventType[] = [
  "WELCOME_CUSTOMER",
  "REWARD_READY",
  "REWARD_REDEEMED",
];

export const marketingEngagementTypes: EngagementEventType[] = [
  "NEAR_REWARD",
  "BIRTHDAY",
  "INACTIVE_30_DAYS",
  "INACTIVE_60_DAYS",
  "INACTIVE_90_DAYS",
];

const dedupedActiveEventTypes: EngagementEventType[] = [
  "REWARD_READY",
  "NEAR_REWARD",
  "BIRTHDAY",
  "INACTIVE_30_DAYS",
  "INACTIVE_60_DAYS",
  "INACTIVE_90_DAYS",
];

export const defaultTemplateCopy: Record<EngagementEventType, { title: string; message: string }> = {
  REWARD_READY: {
    title: "Reward Ready",
    message: "\u{1F389} Congratulations! Your reward is ready to redeem.",
  },
  NEAR_REWARD: {
    title: "Near Reward",
    message: "\u2B50 You're only {{remaining_stamps}} stamps away from your reward.",
  },
  BIRTHDAY: {
    title: "Birthday",
    message: "\u{1F382} Happy Birthday! Enjoy a special reward from us.",
  },
  INACTIVE_30_DAYS: {
    title: "Inactive Customer",
    message: "We miss you. Visit us again and continue earning rewards.",
  },
  INACTIVE_60_DAYS: {
    title: "Inactive Customer",
    message: "We miss you. Visit us again and continue earning rewards.",
  },
  INACTIVE_90_DAYS: {
    title: "Inactive Customer",
    message: "We miss you. Visit us again and continue earning rewards.",
  },
  WELCOME_CUSTOMER: {
    title: "Welcome Customer",
    message: "Welcome to our loyalty program.",
  },
  REWARD_REDEEMED: {
    title: "Reward Redeemed",
    message: "\u{1F381} Thank you for redeeming your reward.",
  },
};

type EngagementTx = Prisma.TransactionClient | typeof prisma;

export function isMarketingEngagement(type: EngagementEventType) {
  return marketingEngagementTypes.includes(type);
}

export async function createEngagementEventIfAllowed({
  tx = prisma,
  businessId,
  customerId,
  eventType,
  metadata = {},
}: {
  tx?: EngagementTx;
  businessId: number;
  customerId: number;
  eventType: EngagementEventType;
  metadata?: Prisma.InputJsonValue;
}) {
  const customer = await tx.businessCustomerMembership.findFirst({
    where: { id: customerId, businessId },
    select: { id: true, marketingConsent: true },
  });

  if (!customer) return null;
  if (isMarketingEngagement(eventType) && !customer.marketingConsent) return null;

  if (dedupedActiveEventTypes.includes(eventType)) {
    const existing = await tx.engagementEvent.findFirst({
      where: {
        businessId,
        customerId,
        eventType,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (existing) return existing;
  }

  return tx.engagementEvent.create({
    data: {
      businessId,
      customerId,
      eventType,
      eventDate: new Date(),
      status: "ACTIVE",
      metadata,
    },
    select: { id: true },
  });
}

export async function createProgramEngagementEvents({
  tx = prisma,
  businessId,
  customerId,
  programMembershipId,
  programName,
  rewardName,
  earnedStamps,
  bonusStamps,
  requiredStamps,
}: {
  tx?: EngagementTx;
  businessId: number;
  customerId: number;
  programMembershipId: number;
  programName: string;
  rewardName: string;
  earnedStamps: number;
  bonusStamps: number;
  requiredStamps: number;
}) {
  const progress = progressValue(earnedStamps, bonusStamps);
  const remainingStamps = Math.max(0, requiredStamps - progress);
  const metadata = {
    programMembershipId,
    programName,
    rewardName,
    progress,
    requiredStamps,
    remainingStamps,
  };

  if (progress >= requiredStamps) {
    await createEngagementEventIfAllowed({
      tx,
      businessId,
      customerId,
      eventType: "REWARD_READY",
      metadata,
    });
    return;
  }

  if (remainingStamps === 2) {
    await createEngagementEventIfAllowed({
      tx,
      businessId,
      customerId,
      eventType: "NEAR_REWARD",
      metadata,
    });
  }
}

export async function getMessageTemplate(businessId: number, eventType: EngagementEventType) {
  const businessTemplate = await prisma.messageTemplate.findFirst({
    where: { businessId, templateType: eventType, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (businessTemplate) return businessTemplate;

  const globalTemplate = await prisma.messageTemplate.findFirst({
    where: { businessId: null, templateType: eventType, active: true },
    orderBy: { createdAt: "desc" },
  });

  return globalTemplate ?? defaultTemplateCopy[eventType];
}

export function renderEngagementMessage(
  message: string,
  metadata: Prisma.JsonValue | null | undefined,
  customerName: string,
  businessName: string,
) {
  const values = typeof metadata === "object" && metadata && !Array.isArray(metadata) ? metadata : {};

  return message
    .replaceAll("{{customer_name}}", customerName)
    .replaceAll("{{business_name}}", businessName)
    .replaceAll("{{remaining_stamps}}", String(values.remainingStamps ?? ""))
    .replaceAll("{{reward_name}}", String(values.rewardName ?? ""))
    .trim();
}
