import "server-only";

import { after } from "next/server";
import { getCardUrl, maskPhoneNumber } from "@/lib/customer-cards";
import { formatUaePhoneForWhatsApp } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { buildWelcomeCardWhatsAppMessage } from "@/lib/whatsapp-messages";
import { createMetaCloudApiSender, type WhatsAppSender } from "@/lib/whatsapp/cloud-api";
import { decryptWhatsAppAccessToken, getWhatsAppEncryptionKey, WHATSAPP_KEY_MISSING_MESSAGE } from "@/lib/whatsapp/credentials";
import {
  deliverWelcomeCard,
  type WelcomeCardChannel,
  type WelcomeCardDeps,
  type WelcomeCardOutcome,
} from "@/lib/whatsapp/welcome-card-delivery";

/**
 * The single automated welcome-card entry point, called from every enrollment
 * path that raises WELCOME_CUSTOMER.
 *
 * Everything here is best-effort: enrollment has already succeeded by the time
 * this runs, and nothing it does may change that. The work is scheduled with
 * `after()` so it never blocks the response, and every error is swallowed.
 */

/** Wires the real database, crypto, URL, and phone implementations. */
function createDeps(): WelcomeCardDeps {
  return {
    async loadContext({ businessId, membershipId }) {
      // One tenant-scoped read. The membership filter carries businessId as well
      // as its own id so a membership can never be read across tenants.
      const [business, customer] = await Promise.all([
        prisma.business.findFirst({
          where: { id: businessId, status: "ACTIVE", deletedAt: null },
          select: {
            name: true,
            whatsAppChannel: {
              select: {
                provider: true,
                phoneNumberId: true,
                accessTokenEncrypted: true,
                connectionStatus: true,
                welcomeTemplateName: true,
                welcomeTemplateLanguage: true,
                welcomeTemplateStatus: true,
              },
            },
          },
        }),
        prisma.businessCustomerMembership.findFirst({
          where: { id: membershipId, businessId, status: "ACTIVE" },
          select: { id: true, firstName: true, phone: true, cardToken: true, marketingConsent: true },
        }),
      ]);

      if (!business) return null;

      return { businessName: business.name, channel: business.whatsAppChannel, customer };
    },

    async hasExistingDelivery({ businessId, membershipId }) {
      // "A welcome delivery already exists for this membership" - keyed through
      // the engagement event the row was raised for, so it never collides with a
      // manually prepared wa.me message for the same customer.
      const existing = await prisma.messageDeliveryQueue.findFirst({
        where: {
          businessId,
          businessCustomerMembershipId: membershipId,
          channel: "WHATSAPP",
          engagementEvent: { eventType: "WELCOME_CUSTOMER" },
        },
        select: { id: true },
      });

      return existing !== null;
    },

    async createDelivery({ businessId, membershipId, recipientMasked, messageBody }) {
      const welcomeEvent = await prisma.engagementEvent.findFirst({
        where: { businessId, customerId: membershipId, eventType: "WELCOME_CUSTOMER" },
        orderBy: { eventDate: "desc" },
        select: { id: true },
      });

      return prisma.messageDeliveryQueue.create({
        data: {
          businessId,
          businessCustomerMembershipId: membershipId,
          engagementEventId: welcomeEvent?.id ?? null,
          channel: "WHATSAPP",
          recipientMasked,
          messageBody,
          status: "READY",
          preparedAt: new Date(),
        },
        select: { id: true },
      });
    },

    async markDeliverySent({ businessId, deliveryId, providerMessageId }) {
      await prisma.messageDeliveryQueue.updateMany({
        where: { id: deliveryId, businessId },
        data: { status: "SENT", providerMessageId, sentAt: new Date(), errorMessage: null },
      });
    },

    async markDeliveryFailed({ businessId, deliveryId, error }) {
      await prisma.messageDeliveryQueue.updateMany({
        where: { id: deliveryId, businessId },
        // Truncated: a provider error is free text and this column feeds an
        // owner-facing panel.
        data: { status: "FAILED", errorMessage: error.slice(0, 500) },
      });
    },

    buildCardUrl: (cardToken) => getCardUrl(cardToken),
    formatRecipient: (phone) => formatUaePhoneForWhatsApp(phone),
    maskRecipient: (phone) => maskPhoneNumber(phone),
    renderMessageBody: ({ businessName, customerName, cardUrl }) =>
      buildWelcomeCardWhatsAppMessage({ businessName, customerName, cardUrl }),

    createSender: async (channel) => resolveSenderForChannel(channel),

    logError: (event, detail) => console.error(event, detail),
  };
}

/**
 * Decrypts the business's stored token and builds a provider sender.
 *
 * The ciphertext arrives on the channel that was already read under this
 * business's id, so there is no second lookup that could reach another tenant's
 * credentials. Switching on `provider` is what keeps a BSP a drop-in later:
 * only this function changes, never a call site.
 */
export function resolveSenderForChannel(channel: WelcomeCardChannel): WhatsAppSender | { error: string } {
  const key = getWhatsAppEncryptionKey();
  if (!key) return { error: WHATSAPP_KEY_MISSING_MESSAGE };

  const accessToken = decryptWhatsAppAccessToken(channel.accessTokenEncrypted, key);
  if (!accessToken) return { error: "Stored WhatsApp access token could not be decrypted." };

  switch (channel.provider) {
    case "META_CLOUD_API":
      return createMetaCloudApiSender({ phoneNumberId: channel.phoneNumberId, accessToken });
    default:
      // THREE_SIXTY_DIALOG is reserved in the schema but has no adapter yet.
      return { error: `WhatsApp provider ${channel.provider} is not supported yet.` };
  }
}

/** Runs the delivery. Never throws. Exported for the test-send action and tests. */
export async function sendWelcomeCardMessage(input: {
  businessId: number;
  membershipId: number;
}): Promise<WelcomeCardOutcome> {
  try {
    return await deliverWelcomeCard(createDeps(), input);
  } catch (error) {
    console.error("whatsapp.welcome-card.unhandled", {
      businessId: input.businessId,
      membershipId: input.membershipId,
      message: error instanceof Error ? error.message : "Unknown error.",
    });
    return { status: "failed", deliveryId: null, error: "Unhandled error." };
  }
}

/**
 * Schedules the welcome card for after the response.
 *
 * Called from every WELCOME_CUSTOMER enrollment path. Enrollment must succeed
 * whatever happens here, so even the scheduling call is guarded: outside a
 * request scope (a seed script, a background job) `after` throws, and that must
 * not surface as an enrollment failure.
 */
export function scheduleWelcomeCardMessage(input: { businessId: number; membershipId: number }) {
  try {
    after(async () => {
      await sendWelcomeCardMessage(input);
    });
  } catch (error) {
    console.error("whatsapp.welcome-card.schedule-failed", {
      businessId: input.businessId,
      message: error instanceof Error ? error.message : "Unknown error.",
    });
  }
}
