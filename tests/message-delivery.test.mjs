import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

const migration = read("prisma/migrations/0015_phase_7e_message_delivery_preparation/migration.sql");
const schema = read("prisma/schema.prisma");
const actions = read("src/app/dashboard/messages/actions.ts");

test("message delivery preparation tables and provider-ready fields exist", () => {
  for (const expected of [
    "business_communication_settings",
    "message_delivery_queue",
    "provider_message_id",
    "error_message",
    "prepared_by_user_id",
    "sent_by_user_id",
    "prevent_message_queue_business_mismatch",
  ]) {
    assert.match(migration, new RegExp(expected));
  }

  assert.match(schema, /model BusinessCommunicationSettings/);
  assert.match(schema, /model MessageDeliveryQueue/);
});

test("preparing messages creates READY queue records and never sends through providers", () => {
  assert.match(actions, /messageDeliveryQueue\.create/);
  assert.match(actions, /status:\s*"READY"/);
  assert.match(actions, /recipientMasked/);
  assert.doesNotMatch(actions, /fetch\(/);
  assert.doesNotMatch(actions, /twilio|sendgrid|mailgun|whatsapp_business/iu);
});

test("marketing consent blocks marketing messages while operational events are available", () => {
  assert.match(actions, /isMarketingEngagement\(event\.eventType\) && !event\.customer\.marketingConsent/);
  assert.match(actions, /Customer has not consented to receive marketing messages/);
  assert.match(read("src/lib/engagement.ts"), /operationalEngagementTypes/);
});

test("message outbox and detail pages are tenant filtered", () => {
  assert.match(read("src/app/dashboard/messages/page.tsx"), /where:\s*{\s*businessId:\s*user\.businessId\s*}/);
  assert.match(read("src/app/dashboard/messages/[id]/page.tsx"), /uuid:\s*id,\s*businessId:\s*user\.businessId/);
  assert.match(actions, /uuid:\s*messageUuid,\s*businessId:\s*user\.businessId/);
});

test("manual status transitions are limited to ready queue records", () => {
  assert.match(actions, /message\.status !== "READY"/);
  assert.match(actions, /status:\s*"SENT_MANUALLY"/);
  assert.match(actions, /status:\s*"CANCELLED"/);
});
