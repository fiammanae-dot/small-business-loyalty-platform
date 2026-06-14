import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

const migration = read("prisma/migrations/0014_phase_7d_engagement_engine/migration.sql");
const schema = read("prisma/schema.prisma");
const engagement = read("src/lib/engagement.ts");

test("engagement events and message templates are modeled and migrated", () => {
  for (const expected of [
    "EngagementEventType",
    "EngagementEventStatus",
    "engagement_events",
    "message_templates",
    "engagement_events_one_active_type_per_customer_idx",
    "prevent_engagement_customer_business_mismatch",
  ]) {
    assert.match(migration, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(schema, /model EngagementEvent/);
  assert.match(schema, /model MessageTemplate/);
});

test("welcome, near reward, reward ready, and redeemed events are wired into loyalty actions", () => {
  assert.match(read("src/app/dashboard/programs/actions.ts"), /eventType:\s*"WELCOME_CUSTOMER"/);
  assert.match(read("src/app/branch/programs/actions.ts"), /eventType:\s*"WELCOME_CUSTOMER"/);
  assert.match(read("src/app/scan/actions.ts"), /createProgramEngagementEvents/);
  assert.match(read("src/app/scan/actions.ts"), /eventType:\s*"REWARD_REDEEMED"/);
  assert.match(engagement, /remainingStamps === 2/);
  assert.match(engagement, /progress >= requiredStamps/);
});

test("marketing consent and duplicate active engagement protection are enforced centrally", () => {
  assert.match(engagement, /isMarketingEngagement\(eventType\) && !customer\.marketingConsent/);
  assert.match(engagement, /dedupedActiveEventTypes\.includes\(eventType\)/);
  assert.match(engagement, /status:\s*"ACTIVE"/);
});

test("business owner engagement pages are tenant filtered and preview-only", () => {
  const listPage = read("src/app/dashboard/engagement/page.tsx");
  const detailPage = read("src/app/dashboard/engagement/[id]/page.tsx");

  assert.match(listPage, /businessId:\s*user\.businessId/);
  assert.match(detailPage, /uuid:\s*id,\s*businessId:\s*user\.businessId/);
  assert.match(detailPage, /Copy WhatsApp Message/);
  assert.match(detailPage, /Copy SMS Message/);
  assert.doesNotMatch(detailPage, /fetch\(/);
});

test("customer profile exposes engagement summary without changing loyalty state", () => {
  const profile = read("src/app/dashboard/customers/[id]/page.tsx");

  assert.match(profile, /Communication history/);
  assert.match(profile, /Last engagement event/);
  assert.match(profile, /Reward Ready count/);
  assert.match(profile, /Rewards Redeemed count/);
});
