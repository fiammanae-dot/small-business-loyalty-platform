/**
 * Phase 4: cashback wallet (Feature 2).
 *
 * A per-customer AED balance that staff top up with a percentage of the bill and
 * the customer spends on future visits. The arithmetic lives in one pure helper
 * so the actions, the customer-profile display and these checks never disagree;
 * the moves are atomic, row-locked, idempotent and never go negative. These
 * checks hold that wiring in place.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("cashback math helper exposes earn, spend-guard, never-negative delta and formatter", () => {
  const helper = read("src/lib/cashback.ts");
  assert.match(helper, /export function computeCashbackEarn/);
  assert.match(helper, /export function canSpendCashback/);
  assert.match(helper, /export function applyCashbackDelta/);
  assert.match(helper, /export function roundAed/);
  assert.match(helper, /export function formatAed/);
  // Earn is a rounded percentage of the bill.
  assert.match(helper, /billAmount \* ratePercent\) \/ 100/);
  // The balance can never go negative.
  assert.match(helper, /Math\.max\(0, roundAed\(balance\) \+ delta\)/);
  // Spend must be positive and within balance.
  assert.match(helper, /amount > 0 && roundAed\(amount\) <= roundAed\(balance\)/);
});

test("add and spend actions are guarded, atomic, row-locked, idempotent and audited", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /export async function addCashbackAction/);
  assert.match(actions, /export async function useCashbackAction/);
  // Support-session aware write guard (platform admin can operate it in an edit session).
  assert.match(actions, /const user = await requireBusinessOwnerForWrite\(\);[\s\S]*addCashbackAction/);
  // Balance + ledger move together in one transaction, under a row lock.
  assert.match(actions, /prisma\.\$transaction/);
  assert.match(actions, /FOR UPDATE/);
  // Idempotency: a double-submit is a no-op caught on the unique key.
  assert.match(actions, /idempotencyKey/);
  assert.match(actions, /isDuplicateWrite/);
  // Spend cannot overdraw.
  assert.match(actions, /canSpendCashback/);
  assert.match(actions, /Not enough cashback balance/);
  // Both directions are audited.
  assert.match(actions, /CASHBACK_EARNED/);
  assert.match(actions, /CASHBACK_SPENT/);
  // Only enabled businesses can transact.
  assert.match(actions, /loadEnabledCashbackSettings/);
});

test("the schema carries the balance column, the ledger table and its enum", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /cashback_balance/);
  assert.match(schema, /model CashbackTransaction \{/);
  assert.match(schema, /enum CashbackTransactionType \{/);
  assert.match(schema, /EARN\s+SPEND\s+REVERSAL/);
  // The idempotency key is unique so a replay cannot double-count.
  assert.match(schema, /idempotencyKey\s+String\?\s+@unique/);
  assert.match(schema, /balanceAfter\s+Decimal/);
});

test("a migration adds the column, the enum and the ledger table", () => {
  const sql = read("prisma/migrations/0057_cashback_wallet/migration.sql");
  assert.match(sql, /ALTER TABLE "business_customer_memberships"[\s\S]*ADD COLUMN "cashback_balance"/);
  assert.match(sql, /CREATE TYPE "CashbackTransactionType" AS ENUM \('EARN', 'SPEND', 'REVERSAL'\)/);
  assert.match(sql, /CREATE TABLE "cashback_transactions"/);
  assert.match(sql, /CREATE UNIQUE INDEX "cashback_transactions_idempotency_key_key"/);
});

test("the customer profile shows the wallet, gated by the per-business switch", () => {
  const page = read("src/app/dashboard/customers/[id]/page.tsx");
  assert.match(page, /function CashbackPanel/);
  assert.match(page, /cashbackEnabled/);
  // The tab only appears when cashback is enabled for the business.
  assert.match(page, /\.\.\.\(cashbackEnabled/);
  assert.match(page, /id: "cashback"/);
  // Add and spend forms post to the actions with matching CSRF scopes.
  assert.match(page, /action=\{addCashbackAction\}/);
  assert.match(page, /action=\{useCashbackAction\}/);
  assert.match(page, /scope="dashboard:cashback-add"/);
  assert.match(page, /scope="dashboard:cashback-spend"/);
});
