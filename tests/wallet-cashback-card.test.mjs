/**
 * Phase 2 of separate wallet cards: a dedicated per-customer CASHBACK Apple
 * Wallet card (customer name + balance), independent of the program passes.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("schema + migration add the per-customer feature pass table", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model AppleWalletFeaturePass \{/);
  assert.match(schema, /enum AppleWalletFeatureKind \{\s*CASHBACK\s*TIER\s*\}/);
  assert.match(schema, /@@unique\(\[businessCustomerMembershipId, kind\]\)/);
  assert.ok(existsSync("prisma/migrations/0061_apple_wallet_feature_passes/migration.sql"), "migration 0061 exists");
  const mig = read("prisma/migrations/0061_apple_wallet_feature_passes/migration.sql");
  assert.match(mig, /CREATE TABLE "apple_wallet_feature_passes"/);
  assert.match(mig, /"AppleWalletFeatureKind" AS ENUM \('CASHBACK', 'TIER'\)/);
});

test("the cashback pass shows the balance, program name and member", () => {
  const mapper = read("src/lib/walletwallet/mapper.ts");
  assert.match(mapper, /export async function buildCashbackPassBody/);
  assert.match(mapper, /label: "Balance", value: balance/);
  assert.match(mapper, /secondaryFields\.push\(\{ label: "Program", value: cardName \}\)/);
  assert.match(mapper, /secondaryFields\.push\(\{ label: "Member", value: customerName \}\)/);
  // barcode is the customer's card URL (per-customer, not per-program)
  assert.match(mapper, /const cardUrl = await getCardUrl\(customer\.cardToken\)/);
});

test("the service syncs a per-customer cashback pass and a balance change refreshes it", () => {
  const svc = read("src/lib/walletwallet/service.ts");
  assert.match(svc, /export async function syncAppleCashbackPass\(businessCustomerMembershipId: number\)/);
  assert.match(svc, /prisma\.appleWalletFeaturePass\.upsert/);
  // kind is a parameter of the shared feature-pass sync
  assert.match(svc, /businessCustomerMembershipId_kind: \{ businessCustomerMembershipId, kind \}/);
  // the cashback-change hook only refreshes a card the customer already added
  assert.match(svc, /export async function syncAppleWalletAfterCashbackChange[\s\S]*refreshAppleFeaturePassIfPresent\(businessCustomerMembershipId, "CASHBACK"\)/);
  // the money path still fires it on earn and spend
  const ledger = read("src/lib/cashback-ledger.ts");
  const calls = ledger.match(/syncAppleWalletAfterCashbackChange\(input\.membershipId\)/g) ?? [];
  assert.equal(calls.length, 2);
});

test("the mint route and card button expose the cashback card", () => {
  assert.ok(existsSync("src/app/api/wallet/apple/cashback/[cardToken]/route.ts"), "cashback route exists");
  const route = read("src/app/api/wallet/apple/cashback/[cardToken]/route.ts");
  assert.match(route, /syncAppleCashbackPass\(customer\.id\)/);
  assert.match(route, /cashbackSettings: \{ select: \{ enabled: true \} \}/);

  const share = read("src/components/CardShareActions.tsx");
  assert.match(share, /cashbackAppleWalletUrl\?: string \| null;/);
  assert.match(share, /Add Cashback card to Apple Wallet/);

  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /const cashbackAppleWalletUrl = membership\.business\.cashbackSettings\?\.enabled \? `\/api\/wallet\/apple\/cashback\/\$\{token\}`/);
  assert.match(page, /cashbackAppleWalletUrl=\{cashbackAppleWalletUrl\}/);
});
