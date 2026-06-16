import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("customer notification schema stores WhatsApp-ready loyalty activity events", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0025_customer_notifications_foundation/migration.sql");

  for (const expected of [
    "enum CustomerNotificationType",
    "NEW_STAMP_EARNED",
    "TIER_UPGRADED",
    "REWARD_AVAILABLE",
    "REFERRAL_REWARD_EARNED",
    "enum CustomerNotificationDeliveryStatus",
    "model CustomerNotification",
    "model CustomerNotificationTemplate",
    "notificationType",
    "businessCustomerMembershipId",
    "deliveryStatus",
    "channel",
    "metadata",
  ]) {
    assert.match(schema, new RegExp(expected));
  }

  assert.match(migration, /customer_notifications/);
  assert.match(migration, /customer_notification_templates/);
  assert.match(migration, /DEFAULT 'WHATSAPP'/);
  assert.match(migration, /DEFAULT 'READY'/);
});

test("customer notification templates cover stamp, tier, reward, and referral events", () => {
  const helper = read("src/lib/customer-notifications.ts");
  const migration = read("prisma/migrations/0025_customer_notifications_foundation/migration.sql");

  for (const expected of [
    "New Stamp Earned",
    "Tier Upgraded",
    "Reward Available",
    "Referral Reward Earned",
    "{{customer_name}}",
    "{{business_name}}",
    "{{reward_name}}",
    "{{bonus_stamps}}",
  ]) {
    assert.match(helper, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(migration, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(helper, /renderCustomerNotificationMessage/);
});

test("notification creation is queued only and does not call WhatsApp providers", () => {
  const helper = read("src/lib/customer-notifications.ts");

  assert.match(helper, /deliveryStatus: "READY"/);
  assert.match(helper, /channel: "WHATSAPP"/);
  assert.doesNotMatch(helper, /fetch\(/);
  assert.doesNotMatch(helper, /twilio|sendgrid|mailgun|whatsapp_business|graph\.facebook/iu);
});

test("loyalty actions create notification records for stamp, tier, reward, and referral activity", () => {
  const scanActions = read("src/app/scan/actions.ts");
  const referrals = read("src/lib/referrals.ts");

  assert.match(scanActions, /notificationType: "NEW_STAMP_EARNED"/);
  assert.match(scanActions, /notificationType: "TIER_UPGRADED"/);
  assert.match(scanActions, /notificationType: "REWARD_AVAILABLE"/);
  assert.match(scanActions, /isTierUpgrade/);
  assert.match(scanActions, /previousProgress < updatedMembership\.loyaltyProgram\.requiredStamps/);
  assert.match(referrals, /notificationType: "REFERRAL_REWARD_EARNED"/);
});
