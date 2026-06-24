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
  assert.match(referralPage, /Join the loyalty program and complete your first visit\. Both you and/);
  assert.match(referralPage, /READY TO SHOW IN STORE/);
  assert.match(referralPage, /Show this QR code to staff/);
  assert.match(referralPage, /Staff can scan this QR code or enter Referral ID \{displayReferralId\} during enrollment/);
  assert.match(referralPage, /How it works/);
  assert.match(referralPage, /Visit the branch/);
  assert.match(referralPage, /Your referral reward is activated/);
  assert.doesNotMatch(referralPage, /Show this referral QR to staff when visiting the branch/);
  assert.match(referralPage, /ReferralInviteActions/);
  assert.match(referralPage, /friendlyReferralId/);
  assert.match(referralPage, /QRCode\.toDataURL/);
  assert.match(referralPage, /ReferralRegistered/);
  assert.match(referralPage, /This referral has already been used and is linked to a customer account/);
  assert.doesNotMatch(referralPage, /Staff enrollment/);
  assert.doesNotMatch(referralPage, /Manager enrollment/);
  assert.doesNotMatch(referralPage, /Copy Referral Code/);
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

test("customer enrollment supports same-business referral lookup by phone", () => {
  const customers = read("src/lib/customers.ts");
  const referrals = read("src/lib/referrals.ts");
  const preview = read("src/components/ReferralPhoneLookupPreview.tsx");
  const ownerNew = read("src/app/dashboard/customers/new/page.tsx");
  const branchNew = read("src/app/branch/customers/new/page.tsx");
  const staffNew = read("src/app/staff/customers/new/page.tsx");

  assert.match(referrals, /findActiveReferralReferrerByPhone/);
  assert.match(referrals, /globalCustomer: \{ normalizedPhone \}/);
  assert.match(referrals, /status: "ACTIVE"/);
  assert.match(referrals, /referralEnabled: true/);
  assert.match(customers, /referredByPhoneNumber/);
  assert.match(customers, /findActiveReferralReferrerByPhone/);
  assert.match(customers, /referralCodeForEnrollment = phoneLookup\.referrer\.referralCode/);
  assert.match(customers, /createPendingReferralForEnrollment/);
  assert.match(preview, /Referred by:/);
  assert.match(preview, /maskPhoneNumber/);

  for (const page of [ownerNew, branchNew, staffNew]) {
    assert.match(page, /Referred by phone number/);
    assert.match(page, /ReferralPhoneLookupPreview/);
    assert.match(page, /Check referrer/);
    assert.match(page, /Referral code or link/);
  }
});