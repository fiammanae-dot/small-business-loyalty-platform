/**
 * When "Add to Wallet" fails for the cashback card, the owner can read why on
 * the customer page (Apple and Google status with the last error), and the
 * stored error carries the provider's own message, not just an HTTP code.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("the customer page shows the cashback card's wallet status and last error", () => {
  const page = readFileSync("src/app/dashboard/customers/[id]/page.tsx", "utf8");
  assert.match(page, /prisma\.appleWalletFeaturePass\.findUnique\(\{\s*where: \{ businessCustomerMembershipId_kind: \{ businessCustomerMembershipId: membership\.id, kind: "CASHBACK" \} \}/);
  assert.match(page, /prisma\.googleWalletCashbackPass\.findUnique\(/);
  assert.match(page, /<WalletPassLine label="Apple Wallet" pass=\{wallet\.apple\} \/>/);
  assert.match(page, /<WalletPassLine label="Google Wallet" pass=\{wallet\.google\} \/>/);
  assert.match(page, /Last error: \{pass\.lastError\}/);
});

test("the WalletWallet client keeps the provider's error text", () => {
  const client = readFileSync("src/lib/walletwallet/client.ts", "utf8");
  assert.match(client, /\[record\.error, record\.message, record\.details\]/);
  assert.match(client, /failed \(HTTP \$\{res\.status\}\)/);
});
