/**
 * Per-customer cashback rate override: the business default still applies to
 * everyone, but an owner can set a custom rate on an individual customer, and
 * earning uses that rate when present.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("schema + migration add the per-customer rate override", () => {
  const schema = read("prisma/schema.prisma");
  const start = schema.indexOf("model BusinessCustomerMembership");
  const model = schema.slice(start, schema.indexOf("@@map(\"business_customer_memberships\")", start));
  assert.match(model, /cashbackRateOverride Decimal\?\s+@map\("cashback_rate_override"\) @db\.Decimal\(5, 2\)/);
  const file = "prisma/migrations/0063_customer_cashback_rate/migration.sql";
  assert.ok(existsSync(file), "migration 0063 exists");
  assert.match(read(file), /ADD COLUMN "cashback_rate_override" DECIMAL\(5,2\)/);
});

test("earning uses the customer's override rate when set, else the business default", () => {
  const effective = /membership\.cashbackRateOverride != null \? Number\(membership\.cashbackRateOverride\) : Number\(settings\.ratePercent\)/;
  assert.match(read("src/app/dashboard/actions.ts"), effective);
  assert.match(read("src/app/scan/actions.ts"), effective);
  // the override is loaded in both earn paths
  assert.match(read("src/app/dashboard/actions.ts"), /select: \{ id: true, createdBranchId: true, cashbackRateOverride: true \}/);
  assert.match(read("src/app/scan/actions.ts"), /cashbackRateOverride: true/);
});

test("the owner action sets or clears a customer's rate", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /export async function saveCustomerCashbackRateAction/);
  assert.match(actions, /validateActionSecurity\(formData, "dashboard:customer-cashback-rate"/);
  // blank clears the override (back to default); value is bounded 0-100
  assert.match(actions, /if \(raw === ""\) \{\s*override = null;/);
  assert.match(actions, /parsedRate < 0 \|\| parsedRate > 100/);
  assert.match(actions, /data: \{ cashbackRateOverride: override \}/);
});

test("the customer cashback panel shows and edits the rate", () => {
  const page = read("src/app/dashboard/customers/[id]/page.tsx");
  assert.match(page, /const effectiveRate = overrideRate \?\? defaultRate;/);
  assert.match(page, /Adds \{effectiveRate\}% of the amount paid/);
  assert.match(page, /action=\{saveCustomerCashbackRateAction\}/);
  assert.match(page, /scope="dashboard:customer-cashback-rate"/);
  assert.match(page, /Cashback rate for this customer/);
});
