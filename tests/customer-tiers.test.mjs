import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("customer tier schema stores configurable criteria and thresholds", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0021_customer_tier_system/migration.sql");

  for (const expected of [
    "enum CustomerTierCriteria",
    "VISITS_ONLY",
    "SPEND_ONLY",
    "VISITS_AND_SPEND",
    "model CustomerTierSetting",
    "premiumVisits",
    "eliteVisits",
    "royalVipVisits",
    "premiumSpend",
    "eliteSpend",
    "royalVipSpend",
  ]) {
    assert.match(schema, new RegExp(expected));
  }

  assert.match(migration, /customer_tier_settings/);
  assert.match(migration, /premium_visits" INTEGER NOT NULL DEFAULT 10/);
  assert.match(migration, /elite_visits" INTEGER NOT NULL DEFAULT 25/);
  assert.match(migration, /royal_vip_visits" INTEGER NOT NULL DEFAULT 50/);
});

test("tier helper supports all criteria modes and plan gating", () => {
  const helper = read("src/lib/customer-tiers.ts");

  for (const expected of [
    "Member",
    "Premium",
    "Elite",
    "Royal VIP",
    "VISITS_ONLY",
    "SPEND_ONLY",
    "VISITS_AND_SPEND",
    "premiumVisits: 10",
    "eliteVisits: 25",
    "royalVipVisits: 50",
    "isTierSystemEnabledForPlan",
    "planName.toLowerCase() !== \"starter\"",
    "calculateCustomerTier",
  ]) {
    assert.match(helper, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("business owner settings expose tier criteria and Starter plan gating", () => {
  const settings = read("src/app/dashboard/settings/page.tsx");
  const actions = read("src/app/dashboard/actions.ts");

  assert.match(settings, /Customer tiers/);
  assert.match(settings, /Tier criteria/);
  assert.match(settings, /Premium visits/);
  assert.match(settings, /Elite visits/);
  assert.match(settings, /Royal VIP visits/);
  assert.match(settings, /Tier system disabled on Starter/);
  assert.match(actions, /saveCustomerTierSettingsAction/);
  assert.match(actions, /Customer tiers require Growth plan or higher/);
  assert.match(actions, /CUSTOMER_TIER_SETTINGS_UPDATED/);
});

test("public customer card shows tiers without exposing spend or internal analytics", () => {
  const card = read("src/app/card/[token]/page.tsx");

  for (const expected of [
    "Customer tier",
    "ROYAL VIP",
    "Visits",
    "Progress to",
    "visit",
    "Exclusive Rewards Available",
    "Scan this card",
  ]) {
    assert.match(card, new RegExp(expected));
  }

  for (const forbidden of [
    "Lifetime spend",
    "Average spend",
    "Customer value score",
    "Risk score",
    "lifetimeSpend",
  ]) {
    assert.doesNotMatch(card, new RegExp(forbidden));
  }
});

test("business owner customer profile shows owner-only tier and spend details", () => {
  const profile = read("src/app/dashboard/customers/[id]/page.tsx");

  assert.match(profile, /Current tier/);
  assert.match(profile, /Lifetime spend/);
  assert.match(profile, /Criteria used/);
  assert.match(profile, /Tier progress/);
  assert.match(profile, /Top Tier Member/);
  assert.match(profile, /Rewards redeemed/);
});
