import "server-only";

import type { CommunicationChannel, MessageDeliveryStatus } from "@prisma/client";
import { maskPhoneNumber } from "@/lib/customer-cards";
import { formatUaePhoneForWhatsApp } from "@/lib/phone";

export const messageChannelLabels: Record<CommunicationChannel, string> = {
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "Email",
  NONE: "None",
};

export const deliveryStatusLabels: Record<MessageDeliveryStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  SENT_MANUALLY: "Sent Manually",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

export const sendableChannels: CommunicationChannel[] = ["WHATSAPP", "SMS", "EMAIL"];

export function getMaskedRecipient(channel: CommunicationChannel, phone: string, email?: string | null) {
  if (channel === "EMAIL") return maskEmail(email);
  return maskPhoneNumber(phone);
}

export function maskEmail(email?: string | null) {
  if (!email) return "No email on file";
  const [name, domain] = email.split("@");
  if (!name || !domain) return "Email hidden";
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

export function getWhatsAppManualLink(phone: string, message: string) {
  const normalized = formatUaePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
