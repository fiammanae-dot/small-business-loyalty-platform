/**
 * One referral reward per business, whatever program the friend's first
 * activity lands in: bonus stamps on one chosen stamp card (never a package),
 * or cashback. Set in the Referral Center, not per program.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");
const context = { programIds: [3, 4], cashbackEnabled: true };

test("the form accepts stamps on an allowed program, cashback when cashback is on, or nothing", async () => {
  const { parseReferralSettingsInput } = await loadTs("src/lib/referral-settings-rules.ts");
  assert.deepEqual(parseReferralSettingsInput({ rewardType: "STAMPS", stampProgramId: "4", referrerStamps: "2", friendStamps: "1" }, context), {
    ok: true,
    data: { rewardType: "STAMPS", stampProgramId: 4, referrerStamps: 2, friendStamps: 1, referrerCashback: 0, friendCashback: 0 },
  });
  assert.deepEqual(parseReferralSettingsInput({ rewardType: "CASHBACK", referrerCashback: "10", friendCashback: "" }, context), {
    ok: true,
    data: { rewardType: "CASHBACK", stampProgramId: null, referrerStamps: 1, friendStamps: 0, referrerCashback: 10, friendCashback: 0 },
  });
  assert.equal(parseReferralSettingsInput({ rewardType: "NONE" }, context).ok, true);
  // A package or a closed program is not in the allowed list.
  assert.match(parseReferralSettingsInput({ rewardType: "STAMPS", stampProgramId: "9", referrerStamps: "1" }, context).error, /which stamp card/);
  assert.match(parseReferralSettingsInput({ rewardType: "STAMPS", stampProgramId: "3", referrerStamps: "0", friendStamps: "0" }, context).error, /at least one bonus stamp/);
  assert.match(parseReferralSettingsInput({ rewardType: "STAMPS", stampProgramId: "3", referrerStamps: "1.5" }, context).error, /whole number/);
  assert.match(parseReferralSettingsInput({ rewardType: "CASHBACK", referrerCashback: "5" }, { ...context, cashbackEnabled: false }).error, /Set up the cashback program first/);
  assert.match(parseReferralSettingsInput({ rewardType: "CASHBACK", referrerCashback: "-1" }, context).error, /between 0 and 1000/);
});

test("a chosen program that was closed or turned into a package pays nothing", async () => {
  const { toView, describeReferralReward } = await loadTs("src/lib/referral-settings-rules.ts");
  const base = { rewardType: "STAMPS", stampProgramId: 3, referrerStamps: 2, friendStamps: 0, referrerCashback: 0, friendCashback: 0 };
  assert.equal(toView({ ...base, stampProgram: { id: 3, name: "Glow", active: true, isMembership: false } }).rewardType, "STAMPS");
  assert.equal(toView({ ...base, stampProgram: { id: 3, name: "Glow", active: false, isMembership: false } }).rewardType, "NONE");
  assert.equal(toView({ ...base, stampProgram: { id: 3, name: "Glow", active: true, isMembership: true } }).rewardType, "NONE");
  assert.equal(toView(null).rewardType, "NONE");
  assert.deepEqual(describeReferralReward(toView({ ...base, friendStamps: 1, stampProgram: { id: 3, name: "Glow", active: true, isMembership: false } })), {
    referrer: "2 bonus stamps on Glow",
    friend: "1 bonus stamp on Glow",
  });
  assert.deepEqual(describeReferralReward(toView({ ...base, rewardType: "CASHBACK", referrerCashback: 10, stampProgram: null })), { referrer: "AED 10.00 cashback", friend: null });
});

test("the reward is paid from the business setting, for stamps, package visits and cashback alike", () => {
  const referrals = read("src/lib/referrals.ts");
  const fn = referrals.slice(referrals.indexOf("export async function qualifyReferral("));
  assert.match(fn, /activity\.kind === "STAMP"/);
  assert.match(fn, /businessReferralSettings\.findUnique/);
  // The referrer (and friend) are enrolled in the chosen stamp card when needed.
  assert.match(fn, /ensureProgramMembership\(\{ tx, businessId, membershipId: grant\.membershipId, program \}\)/);
  assert.match(fn, /membershipId: referredMembershipId, stamps: settings\.friendStamps, who: "friend"/);
  assert.match(fn, /membershipId: referredMembershipId, amount: settings\.friendCashback, who: "friend"/);
  assert.doesNotMatch(referrals, /qualifyReferralFromFirstStamp|qualifyReferralFromFirstCashback|referralRewardBonusStamps|referralRewardAmount/);
  // The scan (stamp and package visits) and cashback flows both call it, and refresh wallet cards after cashback rewards.
  const scan = read("src/app/scan/actions.ts");
  assert.match(scan, /activity: \{ kind: "STAMP", stampTransactionId: stampTransaction\.id, loyaltyProgramId: updatedMembership\.loyaltyProgramId \}/);
  assert.match(scan, /for \(const membershipId of referralCashbackMembershipIds\) \{/);
});

test("the schema and migration carry the setting and keep every business's current reward", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model BusinessReferralSettings \{/);
  assert.match(schema, /rewardType\s+ReferralRewardType\s+@default\(NONE\)/);
  assert.match(schema, /stampProgram LoyaltyProgram\? @relation\(fields: \[stampProgramId\], references: \[id\], onDelete: SetNull\)/);
  const migration = read("prisma/migrations/0072_business_referral_settings/migration.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "business_referral_settings"/);
  assert.match(migration, /WHERE "active" = TRUE AND "is_membership" = FALSE/);
  assert.match(migration, /SELECT c\."business_id", 'CASHBACK', c\."referral_reward_amount"/);
  assert.match(migration, /ON CONFLICT \("business_id"\) DO NOTHING/);
});

test("owners set the reward once in the Referral Center, not per program or in the cashback setup", () => {
  const page = read("src/app/dashboard/referrals/page.tsx");
  assert.match(page, /<ReferralRewardSettingsForm settings=\{referralSettings\}/);
  assert.match(page, /action=\{saveReferralSettingsAction\}/);
  assert.match(read("src/app/dashboard/referrals/actions.ts"), /validateCsrfForm\(formData, "dashboard:referral-settings"\)/);
  assert.match(page, /csrfInput=\{<CsrfInput scope="dashboard:referral-settings" \/>\}/);
  for (const file of ["src/components/ProgramForm.tsx", "src/components/ProgramCreateWizard.tsx", "src/app/dashboard/programs/actions.ts", "src/lib/programs.ts"]) {
    assert.doesNotMatch(read(file), /referralRewardBonusStamps/, file);
  }
  // The friend's landing page promises only what is actually paid.
  const landing = read("src/app/referral/[code]/page.tsx");
  assert.match(landing, /describeReferralReward\(/);
  assert.doesNotMatch(landing, /Both you and .* will receive referral rewards/);
});
