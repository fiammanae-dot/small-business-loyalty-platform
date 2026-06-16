import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tenantRulesMigration = readFileSync("prisma/migrations/0013_database_rules_tenant_isolation/migration.sql", "utf8");
const planRefactorMigration = readFileSync("prisma/migrations/0023_subscription_plan_single_source/migration.sql", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

test("database check constraints protect loyalty, stamp, invoice, payment, and plan rules", () => {
  for (const expected of [
    "loyalty_programs_required_stamps_min_check",
    "loyalty_programs_starting_bonus_min_check",
    "loyalty_programs_starting_bonus_lte_required_check",
    "customer_program_memberships_earned_stamps_min_check",
    "customer_program_memberships_bonus_stamps_min_check",
    "stamp_transactions_quantity_range_check",
    "invoices_amount_min_check",
    "payments_amount_min_check",
    "subscription_plans_max_branches_min_check",
    "subscription_plans_max_loyalty_programs_min_check",
    "subscription_plans_monthly_price_min_check",
    "subscription_plans_annual_price_min_check",
  ]) {
    assert.match(`${tenantRulesMigration}\n${planRefactorMigration}`, new RegExp(expected));
  }
});

test("one active or trial subscription per business is enforced with partial unique index", () => {
  assert.match(tenantRulesMigration, /business_subscriptions_one_active_or_trial_per_business_idx/);
  assert.match(tenantRulesMigration, /WHERE "status" IN \('TRIAL', 'ACTIVE'\)/);
});

test("tenant branch consistency triggers are installed", () => {
  for (const expected of [
    "users_prevent_branch_business_mismatch",
    "business_customer_memberships_prevent_created_branch_business_mismatch",
    "stamp_transactions_prevent_branch_business_mismatch",
    "scan_events_prevent_branch_business_mismatch",
    "reward_redemptions_prevent_branch_business_mismatch",
  ]) {
    assert.match(tenantRulesMigration, new RegExp(expected));
  }
});

test("security headers are configured", () => {
  for (const expected of [
    "Content-Security-Policy",
    "frame-ancestors 'none'",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ]) {
    assert.match(nextConfig, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
