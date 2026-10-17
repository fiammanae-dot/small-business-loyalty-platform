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
  assert.match(referralPage, /t\("referral\.rewardBoth"/);
  assert.match(referralPage, /t\("referral\.readyToShow"\)/);
  assert.match(referralPage, /t\("referral\.showQr"\)/);
  assert.match(referralPage, /t\("referral\.idHelp", \{ id: /);
  assert.match(referralPage, /t\("referral\.howItWorks"\)/);
  assert.match(referralPage, /t\("referral\.step1"\), t\("referral\.step2"\), t\("referral\.step3"\), t\("referral\.step4"\)/);
  assert.doesNotMatch(referralPage, /Show this referral QR to staff when visiting the branch/);
  assert.match(referralPage, /ReferralInviteActions/);
  assert.match(referralPage, /friendlyReferralId/);
  assert.match(referralPage, /QRCode\.toDataURL/);
  assert.match(referralPage, /ReferralRegistered/);
  assert.match(referralPage, /t\("referral\.registeredText"\)/);
  assert.doesNotMatch(referralPage, /Staff enrollment/);
  assert.doesNotMatch(referralPage, /Manager enrollment/);
  assert.doesNotMatch(referralPage, /Copy Referral Code/);
  assert.doesNotMatch(referralPage, /create.*Customer/i);
});

test("first stamp qualifies referral and grants the business's referral reward", () => {
  const scanActions = read("src/app/scan/actions.ts");
  const referrals = read("src/lib/referrals.ts");

  assert.match(scanActions, /qualifyReferral\(/);
  assert.match(referrals, /REFERRAL_QUALIFIED/);
  assert.match(referrals, /businessReferralSettings\.findUnique/);
  assert.match(referrals, /bonusStamps: \{ increment: grant\.stamps \}/);
});

test("public customer card exposes referral link and aggregate referral stats only", () => {
  const card = read("src/app/card/[token]/page.tsx");
  const referralPanel = read("src/components/public-card/ReferralPanel.tsx");

  for (const expected of [
    't\\("referralPanel\\.title"\\)',
    't\\("referralPanel\\.link"\\)',
    't\\("referralPanel\\.pending"\\)',
    't\\("referralPanel\\.qualified"\\)',
    't\\("referralPanel\\.rewards"\\)',
    "ReferralShareActions",
  ]) {
    assert.match(referralPanel, new RegExp(expected));
  }

  assert.match(card, /membership\.referralCode && membership\.referralEnabled \? await getReferralUrl/);
  assert.match(card, /ReferralPanel/);
});

test("business dashboard does not duplicate referral reporting after cleanup", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  assert.match(dashboard, /\{pendingReferrals\} pending \{pendingReferrals === 1 \? "referral" : "referrals"\}/);
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
  const preview = read("src/components/ReferralReferrerLookupPreview.tsx");
  const customerForm = read("src/components/CustomerCreateForm.tsx");
  const ownerNew = read("src/app/dashboard/customers/new/page.tsx");
  const branchNew = read("src/app/branch/customers/new/page.tsx");
  const staffNew = read("src/app/staff/customers/new/page.tsx");

  assert.match(referrals, /findActiveReferralReferrerByPhone/);
  assert.match(referrals, /normalizedPhone,/);
  assert.match(referrals, /lookupActiveReferralReferrers/);
  assert.match(referrals, /trimmedQuery\.length < 2/);
  assert.match(referrals, /status: "TOO_SHORT"/);
  assert.match(referrals, /looksLikePhone/);
  assert.match(referrals, /digitsOnly\.length >= 5/);
  assert.match(referrals, /firstName: \{ contains: trimmedQuery/);
  assert.match(referrals, /lastName: \{ contains: trimmedQuery/);
  assert.match(referrals, /nameParts\.length >= 2/);
  assert.doesNotMatch(referrals, /normalizedPhone: \{ contains: trimmedQuery\.replace\(/);
  assert.doesNotMatch(referrals, /contains: ""/);
  assert.match(referrals, /status: "ACTIVE"/);
  assert.match(referrals, /referralEnabled: true/);
  assert.match(referrals, /businessId,/);
  assert.match(customers, /referredByPhoneNumber/);
  assert.match(customers, /referredBySearch/);
  assert.match(customers, /findActiveReferralReferrerByPhone/);
  assert.match(customers, /referralCodeForEnrollment = phoneLookup\.referrer\.referralCode/);
  assert.match(customers, /createPendingReferralForEnrollment/);
  assert.match(preview, /t\("join\.lookup\.referredBy"\)/);
  assert.match(preview, /t\("join\.lookup\.minChars"\)/);
  assert.match(preview, /t\("join\.lookup\.none"\)/);
  assert.match(preview, /t\("join\.lookup\.choose"\)/);
  assert.match(preview, /maskPhoneNumber/);
  assert.match(customerForm, /Referred by/);
  assert.match(customerForm, /Phone, name, referral code, or referral link/);
  assert.match(customerForm, /referredBySearch/);
  assert.match(customerForm, /Check referrer/);
  assert.doesNotMatch(customerForm, /Referral code or link/);

  for (const page of [ownerNew, branchNew, staffNew]) {
    assert.match(page, /CustomerCreateForm/);
    assert.match(page, /ReferralReferrerLookupPreview/);
    assert.match(page, /referredBySearch/);
  }
});
