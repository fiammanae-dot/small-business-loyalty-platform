import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("referral schema stores configurable rewards and first-stamp qualification data", () => {
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "model Referral",
    "model ReferralReward",
    "model ReferralEvent",
    "referralRewardBonusStamps Int",
    "referredFirstStampBranchId Int?",
    "ReferralStatus",
    "ReferralEventType",
    "@@unique([businessId, referralCode])",
  ]) {
    assert.match(schema, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("customer enrollment creates referral context without public self-registration", () => {
  const customers = read("src/lib/customers.ts");
  const referrals = read("src/lib/referrals.ts");
  const referralPage = read("src/app/referral/[code]/page.tsx");

  assert.match(customers, /generateReferralCode/);
  assert.match(customers, /businessName: business.name/);
  assert.match(customers, /createPendingReferralForEnrollment/);
  assert.match(referrals, /buildBusinessPrefix/);
  assert.match(referrals, /buildCustomerPart/);
  assert.match(referrals, /businessId, referralCode: code/);
  assert.match(referrals, /existingGlobally/);
  assert.match(referrals, /SELF_REFERRAL_BLOCKED/);
  assert.match(referrals, /Self-referrals are blocked/);
  assert.match(referrals, /findActiveReferralReferrerForEnrollment/);
  assert.match(referralPage, /Show this referral code to staff when joining the loyalty program/);
  assert.match(referralPage, /CopyReferralCodeButton/);
  assert.doesNotMatch(referralPage, /Staff enrollment/);
  assert.doesNotMatch(referralPage, /Manager enrollment/);
  assert.doesNotMatch(referralPage, /create.*Customer/i);
});

test("first stamp qualifies referral and grants configured bonus stamps", () => {
  const scanActions = read("src/app/scan/actions.ts");
  const referrals = read("src/lib/referrals.ts");

  assert.match(scanActions, /qualifyReferralFromFirstStamp/);
  assert.match(referrals, /previousStamps/);
  assert.match(referrals, /REFERRAL_QUALIFIED/);
  assert.match(referrals, /referralRewardBonusStamps/);
  assert.match(referrals, /bonusStamps: \{ increment: bonusStamps \}/);
});

test("public customer card exposes referral link and aggregate referral stats only", () => {
  const card = read("src/app/card/[token]/page.tsx");

  for (const expected of [
    "Refer a friend",
    "Referral Link",
    "Pending Referrals",
    "Qualified Referrals",
    "Rewards Earned",
    "ReferralShareActions",
  ]) {
    assert.match(card, new RegExp(expected));
  }

  assert.match(card, /membership\.referralCode && membership\.referralEnabled \? await getReferralUrl/);
});

test("business dashboard does not duplicate referral reporting after cleanup", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  assert.doesNotMatch(dashboard, /Pending Referrals/);
  assert.doesNotMatch(dashboard, /Qualified Referrals/);
  assert.doesNotMatch(dashboard, /Referral Rewards Granted/);
  assert.doesNotMatch(dashboard, /TopReferrers/);
});

test("business owner referral center exposes referral reporting and detail visibility", () => {
  const referralCenter = read("src/app/dashboard/referrals/page.tsx");
  const referralDetail = read("src/app/dashboard/referrals/[id]/page.tsx");

  for (const expected of [
    "Referral Center",
    "Pending referrals",
    "Qualified referrals",
    "Rewards granted",
    "Top referrers",
    "businessId: user.businessId",
    "referralCode",
  ]) {
    assert.match(referralCenter, new RegExp(expected));
  }

  for (const expected of [
    "Referral details",
    "Reward grants",
    "First stamp qualification",
    "Referral event history",
    "uuid: id, businessId: user.businessId",
  ]) {
    assert.match(referralDetail, new RegExp(expected));
  }

  assert.doesNotMatch(referralCenter, /approve/i);
  assert.doesNotMatch(referralDetail, /approve/i);
});

test("public referral landing resolves active business membership referral codes", () => {
  const referrals = read("src/lib/referrals.ts");
  const referralPage = read("src/app/referral/[code]/page.tsx");

  assert.match(referrals, /resolveReferralLandingReferrer/);
  assert.match(referrals, /activeReferralMembershipWhere/);
  assert.match(referrals, /referrerMembership/);
  assert.match(referrals, /referralEnabled/);
  assert.match(referrals, /business\.status !== "ACTIVE"/);
  assert.match(referralPage, /resolveReferralLandingReferrer\(referralCode\)/);
  assert.doesNotMatch(referralPage, /businessCustomerMembership\.findFirst/);
});
