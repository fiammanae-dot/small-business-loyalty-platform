/**
 * The cashback card in Google Wallet (Android) - the twin of the Apple cashback
 * card - and the card page showing the cashback card for its members.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("schema + migration store one Google cashback card per customer", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model GoogleWalletCashbackPass \{[\s\S]*businessCustomerMembershipId Int\s+@unique[\s\S]*@@map\("google_wallet_cashback_passes"\)/);
  const sql = read("prisma/migrations/0065_google_wallet_cashback_pass/migration.sql");
  assert.match(sql, /CREATE TABLE "google_wallet_cashback_passes"/);
  assert.match(sql, /ON DELETE CASCADE/);
});

test("the Google card is built from the same cashback view as the Apple card", () => {
  const mapper = read("src/lib/google-wallet/mapper.ts");
  assert.match(mapper, /export async function buildGoogleWalletCashbackClassPayload/);
  assert.match(mapper, /export async function buildGoogleWalletCashbackObjectPayload/);
  assert.match(mapper, /return buildCashbackPassView\(\{/);
  assert.match(mapper, /hexBackgroundColor: view\.colors\.background/);
  assert.match(mapper, /loyaltyPoints: \{ label: view\.google\.primary\.label, balance: \{ string: view\.google\.primary\.value \} \}/);
  // Non-members' cards go inactive.
  assert.match(mapper, /Boolean\(customer\.cashbackJoinedAt\)/);
  assert.match(mapper, /cashback_\$\{businessUuid\}/);
  assert.match(mapper, /cashback_member_\$\{membershipUuid\}/);
});

test("balance changes and design edits refresh existing Google cashback cards only", () => {
  const service = read("src/lib/google-wallet/service.ts");
  assert.match(service, /export async function syncGoogleCashbackPass/);
  assert.match(service, /export async function createGoogleCashbackSaveLink/);
  const afterChange = service.slice(service.indexOf("export async function syncGoogleWalletAfterCashbackChange"));
  assert.match(afterChange.slice(0, 600), /googleWalletCashbackPass\.findUnique/);
  assert.match(afterChange.slice(0, 600), /if \(!existing\) return;/);
  assert.match(service, /export async function refreshBusinessGoogleCashbackPasses/);
  assert.match(read("src/app/dashboard/actions.ts"), /await refreshBusinessGoogleCashbackPasses\(user\.businessId\);/);
});

test("the mint route only serves cashback members", () => {
  const path = "src/app/api/wallet/google/cashback/[cardToken]/route.ts";
  assert.ok(existsSync(path));
  const route = read(path);
  assert.match(route, /if \(!customer\.cashbackJoinedAt\)/);
  assert.match(route, /if \(!customer\.business\.cashbackSettings\?\.enabled\)/);
  assert.match(route, /createGoogleCashbackSaveLink\(customer\.id\)/);
});

test("the card page offers the right cashback button per phone and shows the cashback card", () => {
  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /const cashbackGoogleWalletUrl = cashbackMember \? `\/api\/wallet\/google\/cashback\/\$\{token\}`/);
  assert.match(page, /cashbackGoogleWalletUrl=\{cashbackGoogleWalletUrl\}/);
  assert.match(page, /const cashbackPassView =\s*cashbackMember && cashbackSettings\s*\? buildCashbackPassView/);
  assert.match(page, /\) : cashbackPassView \? \(\s*<div className="mx-auto grid w-full max-w-\[360px\] justify-items-center gap-3">\s*<WalletPassCard view=\{cashbackPassView\}/);

  const share = read("src/components/CardShareActions.tsx");
  assert.match(share, /\{cashbackGoogleWalletUrl && showGoogle \? \(/);
  assert.match(share, /Add Cashback card to Google Wallet/);
  assert.match(share, /\{cashbackAppleWalletUrl && showApple \? \(/);
  // A cashback-only customer gets no broken "not available yet" program buttons.
  assert.match(share, /\) : walletPrograms \? \(/);
});
