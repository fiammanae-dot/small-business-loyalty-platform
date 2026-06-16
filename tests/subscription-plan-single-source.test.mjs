import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/0023_subscription_plan_single_source/migration.sql", "utf8");
const seed = readFileSync("prisma/seed.js", "utf8");
const pilotSeed = readFileSync("prisma/seed-pilot.js", "utf8");
const seedData = readFileSync("src/lib/seed-data.ts", "utf8");
const businessActions = readFileSync("src/app/platform/businesses/actions.ts", "utf8");
const businessForm = readFileSync("src/components/PlanBillingCycleFields.tsx", "utf8");
const planPage = readFileSync("src/app/platform/plans/page.tsx", "utf8");

test("subscription plans use code, annual price, and billing cycle support", () => {
  assert.match(schema, /code\s+String\s+@unique/);
  assert.match(schema, /annualPrice\s+Decimal\s+@map\("annual_price"\)/);
  assert.match(schema, /billingCycleSupport\s+Json\s+@map\("billing_cycle_support"\)/);
  assert.match(schema, /billingCycle\s+BillingCycle\s+@default\(YEARLY\)/);
});

test("only Starter, Growth, and Multi Branch are seeded as commercial plans", () => {
  for (const source of [migration, seed, pilotSeed, seedData]) {
    assert.match(source, /STARTER/);
    assert.match(source, /GROWTH/);
    assert.match(source, /MULTI_BRANCH/);
  }

  for (const source of [seed, pilotSeed, seedData, planPage]) {
    assert.doesNotMatch(source, /Premium|White Label|Custom Domain|Advanced Reporting|Priority Support|Reseller/);
  }
});

test("final plan pricing and limits are encoded in migration and seed sources", () => {
  for (const source of [migration, seed, pilotSeed, seedData]) {
    assert.match(source, /maxBranches:\s*1|max_branches"\s*=\s*1/);
    assert.match(source, /maxLoyaltyPrograms:\s*1|max_loyalty_programs"\s*=\s*1/);
    assert.match(source, /maxBranches:\s*3|max_branches"\s*=\s*3/);
    assert.match(source, /maxLoyaltyPrograms:\s*5|max_loyalty_programs"\s*=\s*5/);
    assert.match(source, /maxBranches:\s*10|max_branches"\s*=\s*10/);
    assert.match(source, /maxLoyaltyPrograms:\s*15|max_loyalty_programs"\s*=\s*15/);
    assert.match(source, /100\.00|1000\.00/);
    assert.match(source, /200\.00|2000\.00/);
  }
});

test("billing cycle selection is enforced for Multi Branch yearly-only subscriptions", () => {
  assert.match(businessForm, /Multi Branch is yearly billing only/);
  assert.match(businessActions, /isBillingCycleSupported/);
  assert.match(businessActions, /Selected billing cycle is not supported by this plan/);
  assert.match(migration, /'MULTI_BRANCH'[\s\S]*'\["YEARLY"\]'::jsonb/);
});
