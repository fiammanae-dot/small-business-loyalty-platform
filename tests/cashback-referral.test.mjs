/**
 * Cashback referrals: a friend joins cashback with a referral, the referral
 * qualifies on their first cashback purchase, and the referrer gets the
 * business's cashback referral reward added to their balance.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the cashback setup no longer carries its own referral reward (it lives in the Referral Center)", () => {
  assert.doesNotMatch(read("src/app/dashboard/actions.ts"), /referralRewardAmount/);
  assert.doesNotMatch(read("src/components/CashbackSetupForm.tsx"), /referralRewardAmount/);
  assert.match(read("src/components/CashbackSetupForm.tsx"), /set once for the whole business in the Referral Center/);
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
  const fn = referrals.slice(referrals.indexOf("export async function qualifyReferral("));
  assert.match(fn, /where: \{ businessId, referredMembershipId, status: "PENDING" \}/);
  assert.match(fn, /type: "EARN", id: \{ not: activity\.cashbackTransactionId \}/);
  assert.match(fn, /if \(earlier > 0\) return none;/);
  assert.match(fn, /status: "QUALIFIED",\s*qualifiedAt: now/);
  assert.match(fn, /if \(!cashback\?\.enabled\) \{/);
  assert.match(fn, /FOR UPDATE/);
  assert.match(fn, /note: "Referral reward"/);
  assert.match(fn, /eventType: "REWARD_GRANTED"/);

  const ledger = read("src/lib/cashback-ledger.ts");
  assert.match(ledger, /const referral = await qualifyReferral\(\{/);
  assert.match(ledger, /activity: \{ kind: "CASHBACK", cashbackTransactionId: row\.id \}/);
  assert.match(ledger, /for \(const membershipId of walletResult\.rewardedMembershipIds\) \{/);
  // The referrer's history names the reward.
  assert.match(read("src/app/dashboard/customers/[id]/page.tsx"), /\{entry\.note \?\? label\}/);
});
