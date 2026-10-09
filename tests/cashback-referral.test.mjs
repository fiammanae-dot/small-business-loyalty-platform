/**
 * Cashback referrals: a friend joins cashback with a referral, the referral
 * qualifies on their first cashback purchase, and the referrer gets the
 * business's cashback referral reward added to their balance.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the business sets a cashback referral reward", () => {
  assert.match(read("prisma/schema.prisma"), /referralRewardAmount Decimal\? @map\("referral_reward_amount"\) @db\.Decimal\(12, 2\)/);
  assert.match(read("prisma/migrations/0066_cashback_referral_reward/migration.sql"), /ADD COLUMN "referral_reward_amount" DECIMAL\(12,2\)/);
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /if \(formData\.has\("referralRewardAmount"\)\)/);
  assert.match(read("src/components/CashbackSetupForm.tsx"), /name="referralRewardAmount"/);
});

test("the cashback join page records who referred a new customer", () => {
  const page = read("src/app/join/cashback/[token]/page.tsx");
  assert.match(page, /Referred by a friend\?/);
  assert.match(page, /<ReferralReferrerLookupPreview businessId=\{settings\.businessId\}/);
  const action = read("src/app/join/cashback/[token]/actions.ts");
  assert.match(action, /extractReferralCode\(referralLookupInput\)/);
  assert.match(action, /findActiveReferralReferrerByPhone/);
  assert.match(action, /createPendingReferralForEnrollment\(\{[\s\S]*referralCode: referralCodeForEnrollment/);
});

test("the first cashback purchase qualifies the referral and pays the referrer once", () => {
  const referrals = read("src/lib/referrals.ts");
  const fn = referrals.slice(referrals.indexOf("export async function qualifyReferralFromFirstCashback"));
  assert.match(fn, /where: \{ businessId, referredMembershipId, status: "PENDING" \}/);
  assert.match(fn, /type: "EARN", id: \{ not: cashbackTransactionId \}/);
  assert.match(fn, /if \(earlierEarns > 0\) return null;/);
  assert.match(fn, /status: "QUALIFIED", qualifiedAt: now/);
  assert.match(fn, /if \(!settings\?\.enabled \|\| !\(reward > 0\)\) return null;/);
  assert.match(fn, /FOR UPDATE/);
  assert.match(fn, /note: "Referral reward"/);
  assert.match(fn, /eventType: "REWARD_GRANTED"/);

  const ledger = read("src/lib/cashback-ledger.ts");
  assert.match(ledger, /const referral = await qualifyReferralFromFirstCashback\(\{/);
  assert.match(ledger, /if \(walletResult\.rewardedMembershipId\) \{/);
  // The referrer's history names the reward.
  assert.match(read("src/app/dashboard/customers/[id]/page.tsx"), /\{entry\.note \?\? label\}/);
});
