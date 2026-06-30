import { formatUaePhoneForWhatsApp } from "@/lib/phone";

type CardMessageInput = {
  businessName: string;
  customerName: string;
  cardUrl: string;
};

type StampUpdateMessageInput = CardMessageInput & {
  currentVisits: number;
  requiredVisits: number;
};

type RewardReadyMessageInput = CardMessageInput & {
  rewardName: string;
  programName: string;
};

export function buildWelcomeCardWhatsAppMessage({ businessName, customerName, cardUrl }: CardMessageInput) {
  return `Hello ${customerName},

Welcome to ${businessName}!
Your Loyalty Card is ready.

Open your card here:
${cardUrl}

You can save this message for future visits and present the QR code when earning stamps or redeeming rewards.

Thank you for joining our loyalty program.`;
}

export function buildResendCardWhatsAppMessage({ businessName, customerName, cardUrl }: CardMessageInput) {
  return `Hello ${customerName},

Here is your ${businessName} loyalty card:
${cardUrl}

You can present this card at checkout to earn stamps, view rewards, and track your progress.`;
}

export function buildUpdatedCardWhatsAppMessage({
  businessName,
  cardUrl,
  currentVisits,
  requiredVisits,
}: StampUpdateMessageInput) {
  return `Thank you for visiting ${businessName}!

Your loyalty card has just been updated.

Current progress:
${currentVisits} / ${requiredVisits}

View your updated loyalty card here:
${cardUrl}

We look forward to seeing you again!`;
}

export function buildRewardReadyWhatsAppMessage({
  businessName,
  customerName,
  cardUrl,
  rewardName,
  programName,
}: RewardReadyMessageInput) {
  return `Hello ${customerName},

Your reward is ready at ${businessName}.

Reward:
${rewardName}

Program:
${programName}

View your loyalty card here:
${cardUrl}

Please present your card at checkout to redeem your reward.`;
}

export function getWhatsAppManualLink(phone: string | null | undefined, message: string) {
  if (!phone) return null;
  const normalized = formatUaePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
