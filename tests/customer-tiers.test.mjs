import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("customer tier schema stores visit windows, maintenance mode, and configurable visit thresholds", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0021_customer_tier_system/migration.sql");
  const visitMigration = read("prisma/migrations/0024_visit_based_customer_tiers/migration.sql");

  for (const expected of [
    "enum CustomerTierCriteria",
    "VISITS_ONLY",
    "enum CustomerTierQualificationWindow",
    "LIFETIME",
    "DAYS_30",
    "DAYS_60",
    "DAYS_90",
    "MONTHS_12",
    "enum CustomerTierMaintenanceMode",
    "PERMANENT",
    "DYNAMIC",
    "enum CustomerTierName",
    "model CustomerTierSetting",
    "tierQualificationWindow",
    "tierMaintenanceMode",
    "silverVisitRequirement",
    "goldVisitRequirement",
    "vipVisitRequirement",
    "currentTier",
    "tierUpdatedAt",
  ]) {
    assert.match(schema, new RegExp(expected));
  }
  assert.doesNotMatch(schema, /SPEND_ONLY/);
  assert.doesNotMatch(schema, /VISITS_AND_SPEND/);
  assert.doesNotMatch(schema, /premiumSpend|eliteSpend|royalVipSpend/);

  assert.match(migration, /customer_tier_settings/);
  assert.match(visitMigration, /silver_visit_requirement" INTEGER NOT NULL DEFAULT 5/);
  assert.match(visitMigration, /gold_visit_requirement" INTEGER NOT NULL DEFAULT 15/);
  assert.match(visitMigration, /vip_visit_requirement" INTEGER NOT NULL DEFAULT 30/);
  assert.match(visitMigration, /tier_qualification_window" "CustomerTierQualificationWindow" NOT NULL DEFAULT 'DAYS_90'/);
  assert.match(visitMigration, /tier_maintenance_mode" "CustomerTierMaintenanceMode" NOT NULL DEFAULT 'DYNAMIC'/);
});

test("tier helper uses visit-only tiers, qualification windows, and maintenance modes", () => {
  const helper = read("src/lib/customer-tiers.ts");

  for (const expected of [
    "Bronze",
    "Silver",
    "Gold",
    "VIP",
    "VISITS_ONLY",
    "tierQualificationWindow: \"DAYS_90\"",
    "tierMaintenanceMode: \"DYNAMIC\"",
    "silverVisitRequirement: 5",
    "goldVisitRequirement: 15",
    "vipVisitRequirement: 30",
    "countQualifyingVisits",
    "getTierWindowStart",
    "PERMANENT",
    "DYNAMIC",
    "isTierSystemEnabledForPlan",
    "return true",
    "calculateCustomerTier",
    "badgeLabel",
    "badgeIcon",
  ]) {
    assert.match(helper, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(helper, /planName\.toLowerCase\(\) !== "starter"/);
  assert.doesNotMatch(helper, /spend/i);
});

test("business owner settings expose visit-only window and maintenance settings without spend or plan gating", () => {
  const settings = read("src/app/dashboard/settings/page.tsx");
  const actions = read("src/app/dashboard/actions.ts");

  assert.match(settings, /Customer tiers/);
  assert.match(settings, /visit-based Bronze, Silver, Gold, and VIP/);
  assert.match(settings, /Tier calculation method/);
  assert.match(settings, /Qualification window/);
  assert.match(settings, /Maintenance mode/);
  assert.match(settings, /Silver visit requirement/);
  assert.match(settings, /Gold visit requirement/);
  assert.match(settings, /VIP visit requirement/);
  assert.match(settings, /Silver: \{tierConfig\.silverVisitRequirement\} visits/);
  assert.match(settings, /Tiers are available on every plan/);
  assert.doesNotMatch(settings, /spend threshold/);
  assert.doesNotMatch(settings, /Tier system disabled on Starter/);
  assert.match(actions, /saveCustomerTierSettingsAction/);
  assert.match(actions, /criteria: "VISITS_ONLY"/);
  assert.match(actions, /tierQualificationWindow/);
  assert.match(actions, /tierMaintenanceMode/);
  assert.match(actions, /Gold visits must be greater than Silver visits/);
  assert.match(actions, /VIP visits must be greater than Gold visits/);
  assert.doesNotMatch(actions, /Customer tiers require Growth plan or higher/);
  assert.match(actions, /CUSTOMER_TIER_SETTINGS_UPDATED/);
});

test("public customer card shows tiers without exposing spend or internal analytics", () => {
  const card = read("src/app/card/[token]/page.tsx");
  const walletCard = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const tierPanel = read("src/components/public-card/TierStatusPanel.tsx");

  assert.match(card, /tier\.badgeLabel/);
  assert.match(card, /tier\.badgeIcon/);
  assert.match(card, /visitsRemaining=\{tier\.visitsRemaining\}/);
  assert.match(card, /progressPercent=\{tier\.progressPercent\}/);
  assert.match(walletCard, /Scan this card/);
  assert.match(tierPanel, /Customer tier/);
  assert.match(tierPanel, /Exclusive Rewards Available/);

  for (const source of [card, walletCard, tierPanel]) {
    for (const forbidden of [
      "Lifetime spend",
      "Average spend",
      "Customer value score",
      "Risk score",
      "lifetimeSpend",
      "Progress to",
      "Top tier progress",
    ]) {
      assert.doesNotMatch(source, new RegExp(forbidden));
    }
  }
});

test("business owner customer profile recalculates and stores tiers from visit events", () => {
  const profile = read("src/app/dashboard/customers/[id]/page.tsx");
  const scanActions = read("src/app/scan/actions.ts");

  assert.match(profile, /Tier status/);
  assert.match(profile, /Visits completed/);
  assert.match(profile, /Next tier/);
  assert.match(profile, /customerTier\.progressPercent/);
  assert.match(profile, /visitEvents: stampTransactions\.map/);
  assert.match(profile, /currentTier: customerTier\.storedTier/);
  assert.match(profile, /Top tier member with exclusive rewards available/);
  assert.match(profile, /Rewards redeemed/);
  assert.match(scanActions, /calculateCustomerTier/);
  assert.match(scanActions, /visitEvents: tierVisitEvents\.map/);
  assert.match(scanActions, /currentTier: tier\.storedTier/);
  assert.doesNotMatch(profile, /Customer tiers are disabled on Starter/);
  assert.doesNotMatch(profile, /Lifetime spend/);
  assert.doesNotMatch(profile, /Criteria used/);
});
