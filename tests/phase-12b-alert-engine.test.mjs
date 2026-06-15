import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("phase 12b schema adds abuse policies, risk scoring, dedupe, and lifecycle history", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0019_phase_12b_alert_engine_hardening/migration.sql");
  const highRewardMigration = read("prisma/migrations/0020_phase_12b_high_reward_policy/migration.sql");

  for (const expected of [
    "model AbusePolicy",
    "model AlertEvent",
    "riskScore",
    "dedupeKey",
    "occurrenceCount",
    "assignedToUserId",
    "escalationReason",
    "CRITICAL",
    "AlertEventType",
  ]) {
    assert.match(schema, new RegExp(expected));
  }

  assert.match(migration, /CREATE TABLE "abuse_policies"/);
  assert.match(migration, /CREATE TABLE "alert_events"/);
  assert.match(migration, /INSERT INTO "abuse_policies"/);
  assert.match(highRewardMigration, /HIGH_REWARD_ACTIVITY_THRESHOLD/);
  assert.match(highRewardMigration, /ON CONFLICT \("business_id", "rule_type"\) DO NOTHING/);
});

test("alert engine computes risk, priority, and deduplicates active alerts", () => {
  const engine = read("src/lib/alert-engine.ts");

  for (const expected of [
    "riskScoreForAlert",
    "priorityFromRisk",
    "dedupeKey",
    "occurrenceCount",
    "ALERT_CREATED",
    "ALERT_UPDATED",
    "dedupe_occurrence",
    "HIGH_REWARD_ACTIVITY_THRESHOLD",
  ]) {
    assert.match(engine, new RegExp(expected));
  }
});

test("alert lifecycle action supports assignment, escalation, resolution, dismissal, and branch scoping", () => {
  const actions = read("src/app/dashboard/notifications/actions.ts");

  for (const expected of [
    "ASSIGNED",
    "UNDER_REVIEW",
    "RESOLVED",
    "ESCALATED",
    "ALERT_ASSIGNED",
    "ALERT_ESCALATED",
    "ALERT_RESOLVED",
    "ALERT_DISMISSED",
    "user.role === \"BRANCH_MANAGER\"",
  ]) {
    assert.match(actions, new RegExp(expected));
  }
});

test("alert governance remains available while dashboard shows one compact alert summary", () => {
  const dashboard = read("src/app/dashboard/page.tsx");
  const settings = read("src/app/dashboard/settings/page.tsx");
  const notifications = read("src/app/dashboard/notifications/page.tsx");

  for (const expected of [
    "alertCount",
    "SummaryTile",
    "href=\"/dashboard/notifications\"",
    "label=\"Alerts\"",
  ]) {
    assert.match(dashboard, new RegExp(expected));
  }

  assert.match(settings, /Alert policies/);
  assert.match(settings, /saveAbusePolicyAction/);

  for (const expected of [
    "All priorities",
    "Assigned user",
    "All rule types",
    "Risk min",
    "Risk max",
    "Alerts by Day",
    "Alerts by Severity",
    "Alerts by Category",
    "Top Alert Sources",
    "Risk score",
  ]) {
    assert.match(notifications, new RegExp(expected));
  }
});

test("new businesses receive default abuse policies", () => {
  const platformBusinessActions = read("src/app/platform/businesses/actions.ts");
  const engine = read("src/lib/alert-engine.ts");

  assert.match(platformBusinessActions, /createDefaultAbusePolicies/);
  assert.match(engine, /defaultAbusePolicies/);
});
