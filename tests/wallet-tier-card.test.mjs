/**
 * Phase 3 of separate wallet cards: a dedicated per-customer TIER Apple Wallet
 * card (customer name + tier level), reusing the AppleWalletFeaturePass table
 * with kind = TIER. A tier change refreshes a card the customer already added.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the tier pass shows only the tier level and the member name", () => {
  const mapper = read("src/lib/walletwallet/mapper.ts");
  assert.match(mapper, /export async function buildTierPassBody/);
  assert.match(mapper, /const tier = fromStoredTier\(/);
  assert.match(mapper, /primaryFields: \[\{ label: "Tier", value: tier/);
  assert.match(mapper, /secondaryFields: \[\{ label: "Member", value: customerName \}\]/);
});

test("the service syncs cashback and tier through one shared feature-pass path", () => {
  const svc = read("src/lib/walletwallet/service.ts");
  assert.match(svc, /async function syncAppleFeaturePass\(businessCustomerMembershipId: number, kind: FeatureKind\)/);
  assert.match(svc, /export async function syncAppleTierPass\(businessCustomerMembershipId: number\)/);
  assert.match(svc, /buildTierPassBody\(typed\)/);
  // after-change hooks only refresh a card the customer already added
  assert.match(svc, /async function refreshAppleFeaturePassIfPresent/);
  assert.match(svc, /export async function syncAppleWalletAfterTierChange[\s\S]*refreshAppleFeaturePassIfPresent\(businessCustomerMembershipId, "TIER"\)/);
});

test("the mint route and card button expose the tier card, gated on tiers being set up", () => {
  assert.ok(existsSync("src/app/api/wallet/apple/tier/[cardToken]/route.ts"), "tier route exists");
  const route = read("src/app/api/wallet/apple/tier/[cardToken]/route.ts");
  assert.match(route, /syncAppleTierPass\(customer\.id\)/);
  assert.match(route, /tierSetting: \{ select: \{ id: true \} \}/);
  assert.match(route, /if \(!customer\.business\.tierSetting\)/);

  const share = read("src/components/CardShareActions.tsx");
  assert.match(share, /tierAppleWalletUrl\?: string \| null;/);
  assert.match(share, /Add Tier card to Apple Wallet/);

  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /const tierAppleWalletUrl = membership\.business\.tierSetting \? `\/api\/wallet\/apple\/tier\/\$\{token\}`/);
  assert.match(page, /tierAppleWalletUrl=\{tierAppleWalletUrl\}/);
});

test("every tier-change site refreshes the tier card", () => {
  for (const path of [
    "src/app/api/cron/tier-recalc/route.ts",
    "src/app/card/[token]/page.tsx",
    "src/app/dashboard/customers/[id]/page.tsx",
    "src/app/scan/actions.ts",
  ]) {
    assert.match(read(path), /syncAppleWalletAfterTierChange\(/, `${path} refreshes the tier card`);
  }
});
