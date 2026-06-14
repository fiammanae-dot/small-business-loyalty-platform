import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("phase 12a schema adds unified audit and cooldown foundations", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0018_phase_12a_audit_cooldowns/migration.sql");

  for (const expected of [
    "model AuditEvent",
    "model CooldownRule",
    "model CooldownEvent",
    "minimumMinutesBetweenStamps",
    "maximumStampsPerTransaction",
    "maximumStampsPerCustomerPerDay",
    "maximumStampsPerStaffPerDay",
  ]) {
    assert.match(schema, new RegExp(expected));
  }

  for (const expected of ["CREATE TABLE \"audit_events\"", "CREATE TABLE \"cooldown_rules\"", "CREATE TABLE \"cooldown_events\""]) {
    assert.match(migration, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("stamp issuance enforces cooldowns before creating a stamp transaction", () => {
  const scanActions = read("src/app/scan/actions.ts");
  const cooldowns = read("src/lib/cooldowns.ts");

  assert.match(scanActions, /enforceStampCooldown/);
  assert.match(scanActions, /overrideCooldown/);
  assert.match(cooldowns, /MAX_STAMPS_PER_TRANSACTION/);
  assert.match(cooldowns, /MINIMUM_MINUTES_BETWEEN_STAMPS/);
  assert.match(cooldowns, /MAX_STAMPS_PER_CUSTOMER_PER_DAY/);
  assert.match(cooldowns, /MAX_STAMPS_PER_STAFF_PER_DAY/);
  assert.match(cooldowns, /Staff cannot override cooldown rules/);
});

test("audit events are recorded for scoped business actions", () => {
  const customers = read("src/lib/customers.ts");
  const dashboardActions = read("src/app/dashboard/actions.ts");
  const programActions = read("src/app/dashboard/programs/actions.ts");
  const notificationActions = read("src/app/dashboard/notifications/actions.ts");
  const referrals = read("src/lib/referrals.ts");

  for (const expected of [
    "CUSTOMER_CREATED",
    "CUSTOMER_UPDATED",
    "BRANCH_CREATED",
    "BRANCH_UPDATED",
    "STAFF_CREATED",
    "STAFF_UPDATED",
    "CARD_STATUS_UPDATED",
    "SCAN_TOKEN_STATUS_UPDATED",
  ]) {
    assert.match(`${customers}\n${dashboardActions}`, new RegExp(expected));
  }

  assert.match(programActions, /PROGRAM_CREATED/);
  assert.match(programActions, /PROGRAM_UPDATED/);
  assert.match(notificationActions, /ALERT_RESOLVED/);
  assert.match(referrals, /REFERRAL_QUALIFIED/);
  assert.match(referrals, /REFERRAL_REWARD_GRANTED/);
});

test("cooldown controls remain available without dashboard duplication", () => {
  const dashboard = read("src/app/dashboard/page.tsx");
  const settings = read("src/app/dashboard/settings/page.tsx");
  const actions = read("src/app/dashboard/actions.ts");

  assert.doesNotMatch(dashboard, /Cooldown Monitoring/);
  assert.doesNotMatch(dashboard, /Top violating customers and staff/);
  assert.match(settings, /Cooldown policy/);
  assert.match(actions, /COOLDOWN_RULE_UPDATED/);
});
