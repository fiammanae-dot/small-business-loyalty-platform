import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("loyalty card WhatsApp share uses the approved welcome template and secure card URL", () => {
  const component = read("src/components/CardShareActions.tsx");
  const helper = read("src/lib/whatsapp-messages.ts");

  for (const expected of [
    "Hello ${customerName}",
    "Welcome to ${businessName}!",
    "Your Loyalty Card is ready.",
    "Open your card here:",
    "${cardUrl}",
    "present the QR code when earning stamps or redeeming rewards",
    "Thank you for joining our loyalty program.",
    "formatUaePhoneForWhatsApp",
  ]) {
    assert.match(helper, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(helper, /https:\/\/wa\.me\/\$\{normalized\}/);
  assert.match(component, /buildWelcomeCardWhatsAppMessage/);
  assert.match(component, /getWhatsAppManualLink/);
  assert.doesNotMatch(component, /customerId/);
  assert.doesNotMatch(component, /database ID/);
});

test("WhatsApp share disables when customer phone is missing or invalid", () => {
  const component = read("src/components/CardShareActions.tsx");

  assert.match(component, /Customer phone number required/);
  assert.match(component, /Customer phone number is invalid/);
  assert.match(component, /disabled=\{!whatsappUrl \|\| sharing\}/);
});

test("authenticated WhatsApp card shares are audited and role scoped", () => {
  const action = read("src/app/card-share-actions.ts");

  for (const expected of [
    "BUSINESS_OWNER",
    "BRANCH_MANAGER",
    "STAFF",
    "businessId: user.businessId",
    "LOYALTY_CARD_WHATSAPP_SHARE_CLICKED",
    "business_customer_membership",
    "customerId",
    "actorUserId: user.id",
  ]) {
    assert.match(action, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("stamp workflow can issue and share the updated card through WhatsApp", () => {
  const scanPage = read("src/app/scan/[token]/page.tsx");
  const scanActions = read("src/app/scan/actions.ts");
  const prompt = read("src/components/StampWhatsAppSharePrompt.tsx");
  const helper = read("src/lib/whatsapp-messages.ts");

  assert.match(scanPage, /Issue Stamp &amp; Share via WhatsApp/);
  assert.match(scanPage, /shareAfterStamp/);
  assert.match(scanPage, /StampWhatsAppSharePrompt/);
  assert.match(scanPage, /getCardUrl\(businessMembership\.cardToken\)/);
  assert.match(scanActions, /shareAfterStamp/);
  assert.match(scanActions, /params\.set\("share", "whatsapp"\)/);

  for (const expected of [
    "Thank you for visiting ${businessName}!",
    "Your loyalty card has just been updated.",
    "Current progress:",
    "${currentVisits} / ${requiredVisits}",
    "View your updated loyalty card here:",
    "${cardUrl}",
    "We look forward to seeing you again!",
    "formatUaePhoneForWhatsApp",
  ]) {
    assert.match(helper, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const expected of [
    "buildUpdatedCardWhatsAppMessage",
    "getWhatsAppManualLink",
    "auditLoyaltyCardWhatsAppShare",
  ]) {
    assert.match(prompt, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("card delivery controls are available on registration success, profiles, lists, and public card", () => {
  const staffSuccess = read("src/app/staff/customers/success/page.tsx");
  const customerProfile = read("src/app/dashboard/customers/[id]/page.tsx");
  const branchProfile = read("src/app/branch/customers/[id]/page.tsx");
  const branchList = read("src/app/branch/customers/page.tsx");
  const staffProfile = read("src/app/staff/customers/[id]/page.tsx");
  const publicCard = read("src/app/card/[token]/page.tsx");

  for (const source of [staffSuccess, customerProfile, branchProfile, branchList, staffProfile, publicCard]) {
    assert.match(source, /CardShareActions/);
    assert.match(source, /recipientPhone/);
    assert.match(source, /cardUrl/);
  }

  assert.match(publicCard, /whatsappLabel="Share via WhatsApp"/);
  assert.match(publicCard, /Save Your Card/);
  assert.match(publicCard, /Last Updated:/);
  assert.match(publicCard, /always shows your latest stamps, reward status, tier, and QR code/);
});

test("manual WhatsApp phase does not add Cloud API sending or provider environment usage", () => {
  const helper = read("src/lib/whatsapp-messages.ts");
  const cardActions = read("src/components/CardShareActions.tsx");
  const stampPrompt = read("src/components/StampWhatsAppSharePrompt.tsx");

  for (const source of [helper, cardActions, stampPrompt]) {
    assert.doesNotMatch(source, /WHATSAPP_ACCESS_TOKEN|WHATSAPP_PHONE_NUMBER_ID|graph\.facebook|whatsapp_business|fetch\(/iu);
  }
});
