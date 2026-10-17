import { formatUaePhoneForWhatsApp } from "@/lib/phone";
import { resolveLocale } from "@/i18n/locales";

type CardMessageInput = {
  businessName: string;
  customerName: string;
  cardUrl: string;
  /** The customer's language ("en" / "ar"); messages are written in it. */
  locale?: string | null;
};

type StampUpdateMessageInput = CardMessageInput & {
  currentVisits: number;
  requiredVisits: number;
};

type RewardReadyMessageInput = CardMessageInput & {
  rewardName: string;
  programName: string;
};

export function buildWelcomeCardWhatsAppMessage({ businessName, customerName, cardUrl, locale }: CardMessageInput) {
  if (resolveLocale(locale) === "ar") {
    return `مرحباً ${customerName}،

أهلاً بك في ${businessName}!
بطاقة الولاء الخاصة بك جاهزة.

افتح بطاقتك من هنا:
${cardUrl}

احتفظ بهذه الرسالة لزياراتك القادمة واعرض رمز QR عند كسب الأختام أو استبدال المكافآت.

شكراً لانضمامك إلى برنامج الولاء.`;
  }
  return `Hello ${customerName},

Welcome to ${businessName}!
Your Loyalty Card is ready.

Open your card here:
${cardUrl}

You can save this message for future visits and present the QR code when earning stamps or redeeming rewards.

Thank you for joining our loyalty program.`;
}

export function buildResendCardWhatsAppMessage({ businessName, customerName, cardUrl, locale }: CardMessageInput) {
  if (resolveLocale(locale) === "ar") {
    return `مرحباً ${customerName}،

هذه بطاقة الولاء الخاصة بك لدى ${businessName}:
${cardUrl}

اعرض هذه البطاقة عند الدفع لكسب الأختام ومتابعة مكافآتك وتقدمك.`;
  }
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
  locale,
}: StampUpdateMessageInput) {
  if (resolveLocale(locale) === "ar") {
    return `شكراً لزيارتك ${businessName}!

تم تحديث بطاقة الولاء الخاصة بك.

تقدمك الحالي:
${currentVisits} / ${requiredVisits}

اعرض بطاقتك المحدثة من هنا:
${cardUrl}

نتطلع لرؤيتك مرة أخرى!`;
  }
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
  locale,
}: RewardReadyMessageInput) {
  if (resolveLocale(locale) === "ar") {
    return `مرحباً ${customerName}،

مكافأتك جاهزة لدى ${businessName}.

المكافأة:
${rewardName}

البرنامج:
${programName}

اعرض بطاقة الولاء من هنا:
${cardUrl}

اعرض بطاقتك عند الدفع لاستبدال مكافأتك.`;
  }
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
