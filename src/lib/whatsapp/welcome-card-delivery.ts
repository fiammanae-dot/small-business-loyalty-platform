import type { WhatsAppSender } from "@/lib/whatsapp/cloud-api";

/**
 * The decision and bookkeeping for the automated welcome-card send, with every
 * side effect injected.
 *
 * The rules live here rather than in the server module so they can be exercised
 * directly - connected channel, approved template, consent, phone, idempotency,
 * and the SENT/FAILED bookkeeping are the parts worth testing, and none of them
 * need a database to be meaningful. lib/whatsapp/send-welcome-card wires the
 * real Prisma, crypto, URL, and phone implementations in.
 */

export type WelcomeCardChannel = {
  provider: "META_CLOUD_API" | "THREE_SIXTY_DIALOG";
  phoneNumberId: string;
  /** Ciphertext only. Decrypted by the wiring layer, never logged here. */
  accessTokenEncrypted: string;
  connectionStatus: "NOT_CONNECTED" | "CONNECTED" | "ERROR";
  welcomeTemplateName: string;
  welcomeTemplateLanguage: string;
  welcomeTemplateStatus: "PENDING" | "APPROVED" | "REJECTED";
};

export type WelcomeCardCustomer = {
  id: number;
  firstName: string;
  phone: string | null;
  cardToken: string;
  marketingConsent: boolean;
};

export type WelcomeCardContext = {
  businessName: string;
  channel: WelcomeCardChannel | null;
  customer: WelcomeCardCustomer | null;
};

export type WelcomeCardSkipReason =
  | "NO_CONTEXT"
  | "NO_CHANNEL"
  | "NOT_CONNECTED"
  | "TEMPLATE_NOT_APPROVED"
  | "NO_CUSTOMER"
  | "NO_CONSENT"
  | "NO_PHONE"
  | "ALREADY_DELIVERED";

export type WelcomeCardOutcome =
  | { status: "skipped"; reason: WelcomeCardSkipReason }
  | { status: "sent"; deliveryId: number; providerMessageId: string }
  | { status: "failed"; deliveryId: number | null; error: string };

export type WelcomeCardDeps = {
  /** One tenant-scoped read: business name, its channel, and the membership. */
  loadContext(input: { businessId: number; membershipId: number }): Promise<WelcomeCardContext | null>;
  /** True when this membership already has a welcome delivery row of any status. */
  hasExistingDelivery(input: { businessId: number; membershipId: number }): Promise<boolean>;
  createDelivery(input: {
    businessId: number;
    membershipId: number;
    recipientMasked: string;
    messageBody: string;
  }): Promise<{ id: number }>;
  markDeliverySent(input: { businessId: number; deliveryId: number; providerMessageId: string }): Promise<void>;
  markDeliveryFailed(input: { businessId: number; deliveryId: number; error: string }): Promise<void>;
  buildCardUrl(cardToken: string): Promise<string>;
  /** formatUaePhoneForWhatsApp: digits-only MSISDN, or null when unusable. */
  formatRecipient(phone: string): string | null;
  maskRecipient(phone: string): string;
  /** Human-readable rendering stored on the queue row for the audit trail. */
  renderMessageBody(input: { businessName: string; customerName: string; cardUrl: string }): string;
  /** Decrypts the stored token and returns a sender, or an error when it cannot. */
  createSender(channel: WelcomeCardChannel): Promise<WhatsAppSender | { error: string }>;
  logError(event: string, detail: unknown): void;
};

function skip(reason: WelcomeCardSkipReason): WelcomeCardOutcome {
  return { status: "skipped", reason };
}

export async function deliverWelcomeCard(
  deps: WelcomeCardDeps,
  input: { businessId: number; membershipId: number },
): Promise<WelcomeCardOutcome> {
  const context = await deps.loadContext(input);
  if (!context) return skip("NO_CONTEXT");

  // 1. The business must have connected its own number and had the template approved.
  const { channel, customer } = context;
  if (!channel) return skip("NO_CHANNEL");
  if (channel.connectionStatus !== "CONNECTED") return skip("NOT_CONNECTED");
  if (channel.welcomeTemplateStatus !== "APPROVED") return skip("TEMPLATE_NOT_APPROVED");

  // 2. Consent and a usable phone. The welcome card is a marketing send, so the
  // membership's existing marketingConsent flag governs it exactly as it governs
  // every other marketing engagement event.
  if (!customer) return skip("NO_CUSTOMER");
  if (!customer.marketingConsent) return skip("NO_CONSENT");
  if (!customer.phone) return skip("NO_PHONE");

  const recipientPhone = deps.formatRecipient(customer.phone);
  if (!recipientPhone) return skip("NO_PHONE");

  // 3. At most one welcome send per membership, whatever the outcome was. Being
  // enrolled into a second program must not send a second welcome card.
  if (await deps.hasExistingDelivery(input)) return skip("ALREADY_DELIVERED");

  // 4. Card link and recipient.
  const cardUrl = await deps.buildCardUrl(customer.cardToken);
  const messageBody = deps.renderMessageBody({
    businessName: context.businessName,
    customerName: customer.firstName,
    cardUrl,
  });

  // 5. Record the attempt before sending, so a crash mid-send still leaves a
  // trace and cannot produce a second attempt on the next enrollment.
  const delivery = await deps.createDelivery({
    businessId: input.businessId,
    membershipId: input.membershipId,
    recipientMasked: deps.maskRecipient(customer.phone),
    messageBody,
  });

  const sender = await deps.createSender(channel);
  if ("error" in sender) {
    await deps.markDeliveryFailed({ businessId: input.businessId, deliveryId: delivery.id, error: sender.error });
    return { status: "failed", deliveryId: delivery.id, error: sender.error };
  }

  const result = await sender.sendTemplateMessage({
    recipientPhone,
    templateName: channel.welcomeTemplateName,
    templateLanguage: channel.welcomeTemplateLanguage,
    // Matches the approved Meta template `new_loyalty_card`:
    // Body {{1}} = customer first name, {{2}} = business name.
    bodyVariables: [customer.firstName, context.businessName],
    // Meta's dynamic URL button takes only the suffix appended to the base URL
    // registered on the template, so the card token is the parameter.
    urlButtonParameter: customer.cardToken,
  });

  if ("error" in result) {
    deps.logError("whatsapp.welcome-card.send-failed", { businessId: input.businessId, error: result.error });
    await deps.markDeliveryFailed({ businessId: input.businessId, deliveryId: delivery.id, error: result.error });
    return { status: "failed", deliveryId: delivery.id, error: result.error };
  }

  await deps.markDeliverySent({
    businessId: input.businessId,
    deliveryId: delivery.id,
    providerMessageId: result.providerMessageId,
  });

  return { status: "sent", deliveryId: delivery.id, providerMessageId: result.providerMessageId };
}
