/**
 * Cashback wallet (Feature 2): Phase 4 (per-customer AED balance + ledger) and
 * Phase 4.1 (staff add + spend at the scan counter, configurable caps,
 * confirmation-gated spend).
 *
 * The money math is one pure helper; the money MOVEMENT is one shared,
 * transactional, audited module (@/lib/cashback-ledger) that both the owner
 * dashboard and the staff scan flow call - so the rules (atomic balance+ledger,
 * row lock, never-negative, idempotent, capped, audited) can't drift between the
 * two entry points. These checks hold that wiring in place.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("pure math helper: earn, spend-guard, never-negative delta, formatter", () => {
  const helper = read("src/lib/cashback.ts");
  assert.match(helper, /export function computeCashbackEarn/);
  assert.match(helper, /export function canSpendCashback/);
  assert.match(helper, /export function applyCashbackDelta/);
  assert.match(helper, /export function formatAed/);
  assert.match(helper, /billAmount \* ratePercent\) \/ 100/);
  assert.match(helper, /Math\.max\(0, roundAed\(balance\) \+ delta\)/);
  assert.match(helper, /amount > 0 && roundAed\(amount\) <= roundAed\(balance\)/);
});

test("shared ledger module is atomic, row-locked, idempotent, capped and audited", () => {
  const ledger = read("src/lib/cashback-ledger.ts");
  assert.match(ledger, /export async function earnCashback/);
  assert.match(ledger, /export async function spendCashback/);
  // One transaction, under a row lock, for every movement.
  assert.match(ledger, /prisma\.\$transaction/);
  assert.match(ledger, /FOR UPDATE/);
  // Caps enforced here (NULL = no cap).
  assert.match(ledger, /maxBillAmount != null && input\.billAmount > input\.maxBillAmount/);
  assert.match(ledger, /maxRedemption != null && input\.amount > input\.maxRedemption/);
  // Overdraw and double-submit are blocked.
  assert.match(ledger, /canSpendCashback/);
  assert.match(ledger, /Not enough cashback balance/);
  assert.match(ledger, /class DuplicateCashbackError/);
  assert.match(ledger, /P2002/);
  // Both directions audited.
  assert.match(ledger, /CASHBACK_EARNED/);
  assert.match(ledger, /CASHBACK_SPENT/);
});

test("dashboard add/spend are owner-guarded and delegate to the shared ledger", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /export async function addCashbackAction/);
  assert.match(actions, /export async function useCashbackAction/);
  assert.match(actions, /requireBusinessOwnerForWrite/);
  assert.match(actions, /earnCashback\(/);
  assert.match(actions, /spendCashback\(/);
  // Caps come from settings.
  assert.match(actions, /maxBillAmount: settings\.maxBillAmount/);
  assert.match(actions, /maxRedemption: settings\.maxRedemption/);
});

test("scan add/spend run under the staff guard, enforce branch + enabled, delegate to the ledger", () => {
  const scan = read("src/app/scan/actions.ts");
  assert.match(scan, /export async function addCashbackFromScanAction/);
  assert.match(scan, /export async function useCashbackFromScanAction/);
  // Staff-capable, branch-scoped guard (not owner-only).
  assert.match(scan, /requireBusinessScopedUser/);
  assert.match(scan, /isOutOfAssignedBranch/);
  // Must be enabled for the business.
  assert.match(scan, /Cashback is not enabled for this business/);
  // Same shared money path as the dashboard.
  assert.match(scan, /earnCashback\(/);
  assert.match(scan, /spendCashback\(/);
});

test("schema carries the balance, the ledger table, its enum, and the caps", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /cashback_balance/);
  assert.match(schema, /model CashbackTransaction \{/);
  assert.match(schema, /enum CashbackTransactionType \{/);
  assert.match(schema, /idempotencyKey\s+String\?\s+@unique/);
  // Phase 4.1 caps.
  assert.match(schema, /maxBillAmount Decimal\? @map\("max_bill_amount"\)/);
  assert.match(schema, /maxRedemption Decimal\? @map\("max_redemption"\)/);
});

test("migrations add the ledger (0057), the caps (0058) and the invoice ref (0059)", () => {
  const m57 = read("prisma/migrations/0057_cashback_wallet/migration.sql");
  assert.match(m57, /CREATE TABLE "cashback_transactions"/);
  assert.match(m57, /ADD COLUMN "cashback_balance"/);
  const m58 = read("prisma/migrations/0058_cashback_caps/migration.sql");
  assert.match(m58, /ADD COLUMN "max_bill_amount"/);
  assert.match(m58, /ADD COLUMN "max_redemption"/);
  const m59 = read("prisma/migrations/0059_cashback_invoice_number/migration.sql");
  assert.match(m59, /ADD COLUMN "invoice_number"/);
});

test("Phase 4.2: a required invoice number is captured on add, stored, audited, and shown with the staff member who acted", () => {
  // Schema carries the invoice-number column on the ledger.
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /invoiceNumber\s+String\?\s+@map\("invoice_number"\)/);

  // The shared money path stores it on the EARN row and in the audit metadata.
  const ledger = read("src/lib/cashback-ledger.ts");
  assert.match(ledger, /invoiceNumber: string;/);
  assert.match(ledger, /invoiceNumber: input\.invoiceNumber/);
  assert.match(ledger, /metadata: \{[^}]*invoiceNumber: input\.invoiceNumber[^}]*\}/);

  // Both add entry points require it and thread it into earnCashback.
  const dash = read("src/app/dashboard/actions.ts");
  assert.match(dash, /invoiceNumber: z/);
  assert.match(dash, /invoiceNumber: getString\(formData, "invoiceNumber"\)/);
  assert.match(dash, /invoiceNumber: data\.invoiceNumber/);
  const scan = read("src/app/scan/actions.ts");
  assert.match(scan, /invoiceNumber: z/);
  assert.match(scan, /invoiceNumber: getString\(formData, "invoiceNumber"\)/);
  assert.match(scan, /invoiceNumber: data\.invoiceNumber/);

  // Both add forms present a required invoice-number input.
  const scanPage = read("src/app/scan/[token]/page.tsx");
  assert.match(scanPage, /name="invoiceNumber"[^>]*required/);
  const custPage = read("src/app/dashboard/customers/[id]/page.tsx");
  assert.match(custPage, /name="invoiceNumber"[^>]*required/);

  // The customer ledger history surfaces the invoice number and who acted.
  assert.match(custPage, /invoiceNumber: row\.invoiceNumber/);
  assert.match(custPage, /Invoice \$\{entry\.invoiceNumber\}/);
  assert.match(custPage, /by \$\{entry\.staffName\}/);
});

test("owner settings manage the rate and the caps (blank = no limit)", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /parseOptionalCapAmount/);
  assert.match(actions, /blank clears the cap/);
  const settings = read("src/app/dashboard/settings/page.tsx");
  assert.match(settings, /name="maxBillAmount"/);
  assert.match(settings, /name="maxRedemption"/);
});

test("scan page shows the wallet (gated) with a confirmation on spend", () => {
  const page = read("src/app/scan/[token]/page.tsx");
  assert.match(page, /function CashbackScanSection/);
  assert.match(page, /\{cashbackEnabled \?/);
  assert.match(page, /action=\{addCashbackFromScanAction\}/);
  assert.match(page, /action=\{useCashbackFromScanAction\}/);
  // Spend is confirmation-gated.
  assert.match(page, /ConfirmSubmitButton[\s\S]*?Redeem cashback\?/);
  assert.match(page, /scope="scan:cashback-add"/);
  assert.match(page, /scope="scan:cashback-spend"/);
});


test("cashback balance is shown on the Google Wallet pass and refreshed on every change", () => {
  // The pass carries a dedicated "Cashback" row, only when the business enabled cashback.
  const mapper = read("src/lib/google-wallet/mapper.ts");
  assert.match(mapper, /customer\.business\.cashbackSettings\?\.enabled/);
  assert.match(mapper, /id: "cashback"/);
  assert.match(mapper, /header: "Cashback"/);
  assert.match(mapper, /Number\(customer\.cashbackBalance \?\? 0\)\.toFixed\(2\)/);

  // The pass loads the cashback settings so it knows the currency + enabled flag.
  const service = read("src/lib/google-wallet/service.ts");
  assert.match(service, /cashbackSettings: true/);
  // A customer-level re-sync fans out to every pass that customer holds.
  assert.match(service, /export async function syncGoogleWalletAfterCashbackChange/);
  assert.match(service, /businessCustomerMembershipId/);

  // The shared money path refreshes the wallet after both earn and spend.
  const ledger = read("src/lib/cashback-ledger.ts");
  const syncCalls = ledger.match(/syncGoogleWalletAfterCashbackChange\(input\.membershipId\)/g) ?? [];
  assert.equal(syncCalls.length, 2, "earn and spend both re-sync the wallet");
});
