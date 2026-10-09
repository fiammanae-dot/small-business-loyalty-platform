/**
 * Cashback is a program customers JOIN, like stamp and membership programs:
 * only members earn or spend, staff enrol at the counter / on the profile /
 * when creating the customer, customers can self-join with the cashback join
 * link, Members = people who joined, and existing customers with cashback
 * history or a balance were enrolled by the migration so nobody loses money.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");

test("membership helpers", async () => {
  const { isCashbackMember, cashbackProgramOption } = await loadTs("src/lib/cashback.ts");
  assert.equal(isCashbackMember({ cashbackJoinedAt: new Date() }), true);
  assert.equal(isCashbackMember({ cashbackJoinedAt: null }), false);
  assert.equal(isCashbackMember(null), false);
  assert.equal(cashbackProgramOption(null), null);
  assert.equal(cashbackProgramOption({ enabled: false, name: "X", ratePercent: 5 }), null);
  assert.deepEqual(cashbackProgramOption({ enabled: true, name: " ", ratePercent: { toString: () => "7.50" } }), { name: "Cashback", ratePercent: "7.5" });
  assert.deepEqual(cashbackProgramOption({ enabled: true, name: "Glow Back", ratePercent: 10 }), { name: "Glow Back", ratePercent: "10" });
});

test("schema + migration: join marker, join link, and backfill so nobody loses money", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /cashbackJoinedAt\s+DateTime\?\s+@map\("cashback_joined_at"\)/);
  assert.match(schema, /joinToken\s+String\s+@unique @default\(uuid\(\)\) @map\("join_token"\) @db\.Uuid\n(?:.*\n)*?\s*name\s+String\?/);
  const sql = read("prisma/migrations/0064_cashback_enrollment/migration.sql");
  assert.match(sql, /ADD COLUMN "cashback_joined_at" TIMESTAMP\(3\)/);
  assert.match(sql, /"cashback_balance" > 0/);
  assert.match(sql, /EXISTS \(SELECT 1 FROM "cashback_transactions"/);
  assert.match(sql, /MIN\(t\."created_at"\)/);
  assert.match(sql, /"join_token" UUID NOT NULL DEFAULT gen_random_uuid\(\)/);
  assert.match(sql, /CREATE UNIQUE INDEX "business_cashback_settings_join_token_key"/);
});

test("the ledger refuses to earn or spend for non-members", () => {
  const ledger = read("src/lib/cashback-ledger.ts");
  const guards = ledger.match(/if \(!locked\.cashbackJoinedAt\) throw new CashbackError\(CASHBACK_NOT_JOINED_MESSAGE\);/g) ?? [];
  assert.equal(guards.length, 2, "earn and spend both check membership under the row lock");
});

test("enrolment is idempotent and audited", () => {
  const lib = read("src/lib/cashback-enrollment.ts");
  assert.match(lib, /where: \{ id: input\.membershipId, businessId: input\.businessId, cashbackJoinedAt: null \}/);
  assert.match(lib, /if \(updated\.count === 0\) return false;/);
  assert.match(lib, /action: "CASHBACK_JOINED"/);
  assert.match(lib, /\/join\/cashback\/\$\{token\}/);
});

test("staff can enrol from the customer profile, the scanner and the new-customer form", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /export async function joinCashbackAction/);
  assert.match(actions, /validateActionSecurity\(formData, "dashboard:cashback-join"/);
  const profile = read("src/app/dashboard/customers/[id]/page.tsx");
  assert.match(profile, /joined=\{isCashbackMember\(membership\)\}/);
  assert.match(profile, /<form action=\{joinCashbackAction\}/);
  assert.match(profile, /Enrol in cashback/);

  const scan = read("src/app/scan/actions.ts");
  assert.match(scan, /export async function joinCashbackFromScanAction/);
  assert.match(scan, /validateCsrfForm\(formData, "scan:cashback-join"\)/);
  const scanPage = read("src/app/scan/[token]/page.tsx");
  assert.match(scanPage, /joined=\{isCashbackMember\(businessMembership\)\}/);
  assert.match(scanPage, /<form action=\{joinCashbackFromScanAction\}>/);

  const customers = read("src/lib/customers.ts");
  assert.match(customers, /if \(getCheckbox\(formData, "joinCashback"\)\)/);
  const form = read("src/components/CustomerCreateForm.tsx");
  assert.match(form, /name="joinCashback"/);
  for (const page of ["src/app/dashboard/customers/new/page.tsx", "src/app/staff/customers/new/page.tsx", "src/app/branch/customers/new/page.tsx"]) {
    assert.match(read(page), /cashbackProgram=\{cashbackProgramOption\(/, page);
  }
  for (const file of ["src/app/dashboard/actions.ts", "src/app/staff/customers/actions.ts", "src/app/branch/customers/actions.ts"]) {
    assert.match(read(file), /checkboxFields: \["marketingConsent", "joinCashback"\]/, file);
  }
});

test("customers can join with the cashback join link", () => {
  assert.ok(existsSync("src/app/join/cashback/[token]/page.tsx"));
  const action = read("src/app/join/cashback/[token]/actions.ts");
  assert.match(action, /where: \{ joinToken: parsed\.data\.token \}/);
  assert.match(action, /if \(!settings\?\.enabled \|\| settings\.business\.status !== "ACTIVE"\)/);
  assert.match(action, /isPublicActionRateLimited\(\{ scope: JOIN_CASHBACK_RATE_LIMIT_SCOPE/);
  assert.match(action, /source: "SELF_SIGNUP"/);
  const detail = read("src/app/dashboard/programs/cashback/page.tsx");
  assert.match(detail, /getCashbackJoinQrDataUrl\(settings\.joinToken\)/);
  assert.match(detail, /title="Program Join QR"/);
  assert.match(detail, /title="Latest members"/);
});

test("no more 'applies to all customers' wording", () => {
  for (const file of [
    "src/app/dashboard/programs/page.tsx",
    "src/app/dashboard/programs/cashback/page.tsx",
    "src/components/CashbackSetupForm.tsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /applies to all customers|value="All customers"|business-wide/i, file);
  }
  const detail = read("src/app/dashboard/programs/cashback/page.tsx");
  assert.match(detail, /count\(\{ where: memberWhere \}\)/);
  assert.match(detail, /const memberWhere = \{ businessId: business\.id, cashbackJoinedAt: \{ not: null \} \};/);
});
