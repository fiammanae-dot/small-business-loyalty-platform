import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

const scanActions = read("src/app/scan/actions.ts");
const migration = read("prisma/migrations/0013_database_rules_tenant_isolation/migration.sql");

test("stamp issuance updates earned stamps only and preserves bonus stamps", () => {
  assert.match(scanActions, /earnedStamps:\s*{\s*increment:\s*data\.quantity\s*}/);
  assert.doesNotMatch(scanActions, /bonusStamps:\s*{\s*increment:\s*data\.quantity\s*}/);
});

test("multiple stamp issuance requires a reason and quantity is database bounded", () => {
  assert.match(scanActions, /Reason is required when issuing more than one stamp/);
  assert.match(migration, /stamp_transactions_quantity_range_check/);
  assert.match(migration, /"quantity" >= 1 AND "quantity" <= 5/);
});

test("stamp and redemption audit records are immutable", () => {
  assert.match(read("prisma/migrations/0009_stamp_transaction_immutability/migration.sql"), /BEFORE UPDATE OR DELETE ON "public"\."stamp_transactions"/);
  assert.match(read("prisma/migrations/0011_reward_redemption_immutability/migration.sql"), /BEFORE UPDATE OR DELETE ON "public"\."reward_redemptions"/);
});

test("duplicate idempotency keys are rejected at database and action level", () => {
  assert.match(read("prisma/schema.prisma"), /idempotencyKey\s+String\?\s+@unique/);
  assert.match(scanActions, /findUnique\({\s*where:\s*{\s*idempotencyKey/s);
});

test("reward redemption permissions and reset behavior remain correct", () => {
  const redemptionAction = scanActions.slice(scanActions.indexOf("export async function redeemRewardAction"));
  assert.match(redemptionAction, /\["BUSINESS_OWNER", "BRANCH_MANAGER"\]\.includes\(user\.role\)/);
  assert.doesNotMatch(redemptionAction, /"STAFF"/);
  assert.match(redemptionAction, /earnedStamps:\s*0/);
  assert.match(redemptionAction, /bonusStamps:\s*lockedMembership\.loyaltyProgram\.startingBonusStamps/);
});

test("subscription and inactive branch restrictions guard critical workflows", () => {
  for (const expected of [
    "requireUsableSubscription",
    "requireActiveBranch",
    "SUBSCRIPTION_REQUIRED_MESSAGE",
    "BRANCH_INACTIVE_MESSAGE",
  ]) {
    assert.match(scanActions + read("src/app/scan/[token]/page.tsx"), new RegExp(expected));
  }
});
