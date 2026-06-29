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
test("repeated single-stamp issuance requires a reason and creates abuse alert context", () => {
  assert.match(scanActions, /REPEATED_STAMP_WINDOW_MINUTES\s*=\s*10/);
  assert.match(scanActions, /REPEATED_STAMP_REASON_THRESHOLD\s*=\s*3/);
  assert.match(scanActions, /Multiple stamps were issued to this customer in a short time\. Please provide a reason\./);
  assert.match(scanActions, /issuedByUserId:\s*user\.id/);
  assert.match(scanActions, /customerProgramMembershipId:\s*programMembership\.id/);
  assert.match(scanActions, /REPEATED_STAMPS_SHORT_WINDOW/);
  assert.match(scanActions, /stampsInWindow:\s*repeatedStampWindowTotal/);
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
  assert.match(redemptionAction, /\["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"\]\.includes\(user\.role\)/);
  assert.match(redemptionAction, /businessMembership\.businessId !== user\.businessId/);
  assert.match(redemptionAction, /redeemedByUserId:\s*user\.id/);
  assert.match(redemptionAction, /earnedStamps:\s*0/);
  assert.match(redemptionAction, /bonusStamps:\s*getStartingBonusStampsForEvent\(\{[\s\S]*event:\s*"CARD_RESET"/);
});

test("starting stamp policy migration preserves existing program reset behavior", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0037_starting_stamp_policy/migration.sql");
  const programs = read("src/lib/programs.ts");

  assert.match(schema, /enum StartingStampPolicy/);
  assert.match(schema, /startingStampPolicy\s+StartingStampPolicy/);
  assert.match(migration, /starting_bonus_stamps/);
  assert.match(migration, /NEVER/);
  assert.match(migration, /EVERY_COMPLETED_CARD/);
  assert.match(programs, /event === "INITIAL_ENROLLMENT"/);
  assert.match(programs, /startingStampPolicy === "EVERY_COMPLETED_CARD"/);
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

