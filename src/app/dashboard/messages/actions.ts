"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CommunicationChannel } from "@prisma/client";
import { requireBusinessScopedUserOrRedirect } from "@/lib/authz";
import { validateCsrfForm } from "@/lib/csrf";
import { getMessageTemplate, isMarketingEngagement, renderEngagementMessage } from "@/lib/engagement";
import { getMaskedRecipient, sendableChannels } from "@/lib/messages";
import { blockDemoModeExternalAction } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

function requireMessagingBusinessOwner() {
  // Same behavior as the previous inline pair: requireRole("BUSINESS_OWNER")
  // semantics, then a missing businessId redirects to /dashboard.
  return requireBusinessScopedUserOrRedirect({
    roles: ["BUSINESS_OWNER"],
    onMissingBusiness: () => redirect("/dashboard"),
  });
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function validateSecurity(formData: FormData, scope: string, path: string) {
  try {
    validateCsrfForm(formData, scope);
  } catch {
    fail(path, "Security check failed. Please refresh and try again.");
  }
}

export async function prepareMessageAction(formData: FormData) {
  const eventUuid = getString(formData, "eventUuid");
  const path = `/dashboard/engagement/${eventUuid}`;
  validateSecurity(formData, "dashboard:messages", path);
  const user = await requireMessagingBusinessOwner();

  const channel = getString(formData, "channel") as CommunicationChannel;
  if (!sendableChannels.includes(channel)) fail(path, "Select a valid message channel.");

  const event = await prisma.engagementEvent.findFirst({
    where: { uuid: eventUuid, businessId: user.businessId },
    include: {
      customer: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!event) fail("/dashboard/engagement", "Engagement event not found.");
  if (isMarketingEngagement(event.eventType) && !event.customer.marketingConsent) {
    fail(path, "Customer has not consented to receive marketing messages.");
  }

  const customer = event.customer;
  if (channel === "EMAIL" && !customer.email) fail(path, "Customer email is not available.");

  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const template = await getMessageTemplate(user.businessId, event.eventType);
  const messageBody = renderEngagementMessage(template.message, event.metadata, customerName, event.customer.business.name);

  const queued = await prisma.messageDeliveryQueue.create({
    data: {
      businessId: user.businessId,
      engagementEventId: event.id,
      businessCustomerMembershipId: event.customerId,
      channel,
      recipientMasked: getMaskedRecipient(channel, customer.phone, customer.email),
      messageBody,
      status: "READY",
      preparedByUserId: user.id,
      preparedAt: new Date(),
    },
    select: { uuid: true },
  });

  revalidatePath("/dashboard/messages");
  revalidatePath(path);
  redirect(`/dashboard/messages/${queued.uuid}?success=Message prepared.`);
}

export async function markMessageSentManuallyAction(formData: FormData) {
  const messageUuid = getString(formData, "messageUuid");
  const path = `/dashboard/messages/${messageUuid}`;
  validateSecurity(formData, "dashboard:messages", path);
  const user = await requireMessagingBusinessOwner();

  const message = await prisma.messageDeliveryQueue.findFirst({
    where: { uuid: messageUuid, businessId: user.businessId },
    select: { id: true, status: true, channel: true },
  });
  if (!message) fail("/dashboard/messages", "Message not found.");
  if (message.status !== "READY") fail(path, "Only ready messages can be marked sent.");

  const blocked = await blockDemoModeExternalAction({
    actorUserId: user.id,
    businessId: user.businessId,
    attemptedAction: "MESSAGE_SENT_MANUALLY",
    entityType: "message_delivery_queue",
    entityId: message.id,
    metadata: { channel: message.channel, messageUuid },
  });
  if (blocked) {
    fail(path, "This action is currently restricted. Customer messaging is paused.");
  }

  await prisma.messageDeliveryQueue.update({
    where: { id: message.id },
    data: {
      status: "SENT_MANUALLY",
      sentByUserId: user.id,
      sentAt: new Date(),
    },
  });

  revalidatePath("/dashboard/messages");
  redirect(`${path}?success=Message marked sent manually.`);
}

export async function cancelMessageAction(formData: FormData) {
  const messageUuid = getString(formData, "messageUuid");
  const path = `/dashboard/messages/${messageUuid}`;
  validateSecurity(formData, "dashboard:messages", path);
  const user = await requireMessagingBusinessOwner();

  const message = await prisma.messageDeliveryQueue.findFirst({
    where: { uuid: messageUuid, businessId: user.businessId },
    select: { id: true, status: true },
  });
  if (!message) fail("/dashboard/messages", "Message not found.");
  if (!["DRAFT", "READY"].includes(message.status)) fail(path, "This message can no longer be cancelled.");

  await prisma.messageDeliveryQueue.update({
    where: { id: message.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/messages");
  redirect(`${path}?success=Message cancelled.`);
}
