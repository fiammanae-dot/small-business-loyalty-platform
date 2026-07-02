import "server-only";

import type { CustomerNotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationTx = Prisma.TransactionClient | typeof prisma;

export const customerNotificationLabels: Record<CustomerNotificationType, string> = {
  NEW_STAMP_EARNED: "New Stamp Earned",
  TIER_UPGRADED: "Tier Upgraded",
  REWARD_AVAILABLE: "Reward Available",
  REFERRAL_REWARD_EARNED: "Referral Reward Earned",
};

export const defaultCustomerNotificationTemplates: Record<CustomerNotificationType, { title: string; message: string }> = {
  NEW_STAMP_EARNED: {
    title: "New Stamp Earned",
    message:
      "Great news {{customer_name}}! You earned {{quantity}} stamp{{quantity_plural}} at {{business_name}}. Your progress is now {{progress}}/{{required_stamps}}.",
  },
  TIER_UPGRADED: {
    title: "Tier Upgraded",
    message: "Congratulations {{customer_name}}! You are now a {{tier_name}} member at {{business_name}}.",
  },
  REWARD_AVAILABLE: {
    title: "Reward Available",
    message:
      "Congratulations {{customer_name}}! Your reward is ready at {{business_name}}: {{reward_name}}. Show your loyalty card QR code to redeem.",
  },
  REFERRAL_REWARD_EARNED: {
    title: "Referral Reward Earned",
    message:
      "Thank you {{customer_name}}! Your referral reward is ready at {{business_name}}. You earned {{bonus_stamps}} bonus stamp{{bonus_plural}}.",
  },
};

export async function createCustomerNotification({
  tx = prisma,
  businessId,
  customerId,
  notificationType,
  metadata = {},
}: {
  tx?: NotificationTx;
  businessId: number;
  customerId: number;
  notificationType: CustomerNotificationType;
  metadata?: Record<string, unknown>;
}) {
  const membership = await tx.businessCustomerMembership.findFirst({
    where: { id: customerId, businessId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      business: { select: { name: true } },
    },
  });
  if (!membership) return null;

  const template = await getCustomerNotificationTemplate(tx, businessId, notificationType);
  const customerName = `${membership.firstName} ${membership.lastName ?? ""}`.trim();
  const messageBody = renderCustomerNotificationMessage(template.message, {
    ...metadata,
    customer_name: customerName,
    business_name: membership.business.name,
  });

  return tx.customerNotification.create({
    data: {
      businessId,
      businessCustomerMembershipId: customerId,
      notificationType,
      channel: "WHATSAPP",
      title: template.title,
      messageBody,
      deliveryStatus: "READY",
      metadata: metadata as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}

async function getCustomerNotificationTemplate(
  tx: NotificationTx,
  businessId: number,
  notificationType: CustomerNotificationType,
) {
  const businessTemplate = await tx.customerNotificationTemplate.findFirst({
    where: { businessId, notificationType, active: true },
    orderBy: { createdAt: "desc" },
    select: { title: true, message: true },
  });
  if (businessTemplate) return businessTemplate;

  const globalTemplate = await tx.customerNotificationTemplate.findFirst({
    where: { businessId: null, notificationType, active: true },
    orderBy: { createdAt: "desc" },
    select: { title: true, message: true },
  });

  return globalTemplate ?? defaultCustomerNotificationTemplates[notificationType];
}

export function renderCustomerNotificationMessage(message: string, metadata: Record<string, unknown>) {
  return Object.entries(metadata).reduce(
    (rendered, [key, value]) => rendered.replaceAll(`{{${key}}}`, String(value ?? "")),
    message,
  );
}
