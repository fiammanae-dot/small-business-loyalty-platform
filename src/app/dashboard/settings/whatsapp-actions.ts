"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { requireBusinessOwner } from "@/lib/business-owner";
import { validateCsrfForm } from "@/lib/csrf";
import { formatUaePhoneForWhatsApp, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { resolveSenderForChannel } from "@/lib/whatsapp/send-welcome-card";

const SETTINGS_PATH = "/dashboard/settings";
const WHATSAPP_TAB = `${SETTINGS_PATH}?tab=messaging`;

function fail(message: string): never {
  redirect(`${WHATSAPP_TAB}&error=${encodeURIComponent(message)}`);
}

/**
 * Sends the welcome template to a number the owner supplies, so they can prove
 * the connection works before any customer is involved.
 *
 * Deliberately does not write to MessageDeliveryQueue: that table records
 * deliveries to a customer membership, and a test send has no customer. The
 * result is reported back on the settings page instead.
 */
export async function sendWhatsAppTestMessageAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "dashboard:whatsapp-test");
  } catch {
    fail("Security check failed. Please refresh and try again.");
  }

  const user = await requireBusinessOwner();

  const rawPhone = formData.get("testPhone");
  const normalized = normalizePhone(typeof rawPhone === "string" ? rawPhone : "");
  const recipientPhone = normalized ? formatUaePhoneForWhatsApp(normalized) : null;
  if (!recipientPhone) fail("Enter a valid UAE mobile number, for example 050 123 4567.");

  const channel = await prisma.businessWhatsAppChannel.findUnique({
    where: { businessId: user.businessId },
    select: {
      provider: true,
      phoneNumberId: true,
      accessTokenEncrypted: true,
      connectionStatus: true,
      welcomeTemplateName: true,
      welcomeTemplateLanguage: true,
      welcomeTemplateStatus: true,
    },
  });

  if (!channel) fail("WhatsApp is not connected for this business yet.");
  if (channel.connectionStatus !== "CONNECTED") fail("WhatsApp is not connected for this business yet.");
  if (channel.welcomeTemplateStatus !== "APPROVED") fail("The welcome template is not approved by Meta yet.");

  const sender = resolveSenderForChannel(channel);
  if ("error" in sender) fail(sender.error);

  // A real card token so the button in the test message behaves exactly as it
  // will for a customer; falls back to the business's own settings page link
  // when the business has no customers yet.
  const sampleMembership = await prisma.businessCustomerMembership.findFirst({
    where: { businessId: user.businessId, status: "ACTIVE" },
    select: { cardToken: true },
    orderBy: { id: "desc" },
  });

  const business = await prisma.business.findUnique({ where: { id: user.businessId }, select: { name: true } });

  const result = await sender.sendTemplateMessage({
    recipientPhone,
    templateName: channel.welcomeTemplateName,
    templateLanguage: channel.welcomeTemplateLanguage,
    // Matches the approved Meta template `new_loyalty_card`:
    // Body {{1}} = customer name, {{2}} = business name.
    bodyVariables: [user.name, business?.name ?? "Your business"],
    urlButtonParameter: sampleMembership?.cardToken ?? "",
  });

  await prisma.businessWhatsAppChannel.update({
    where: { businessId: user.businessId },
    data: {
      lastCheckedAt: new Date(),
      lastErrorMessage: "error" in result ? result.error.slice(0, 500) : null,
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "WHATSAPP_TEST_MESSAGE_SENT",
    entityType: "business_whatsapp_channel",
    // Never the recipient number or the token - audit metadata is widely readable.
    metadata: { succeeded: !("error" in result) },
  });

  revalidatePath(SETTINGS_PATH);

  if ("error" in result) fail(`Test message failed: ${result.error}`);
  redirect(`${WHATSAPP_TAB}&success=${encodeURIComponent("Test WhatsApp message sent.")}`);
}
