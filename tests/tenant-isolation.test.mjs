import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Business Owner customer and program pages filter by own business", () => {
  assert.match(read("src/lib/customers.ts"), /uuid,\s*businessId/);
  assert.match(read("src/app/dashboard/programs/[id]/page.tsx"), /uuid:\s*id,\s*businessId:\s*user\.businessId/);
  assert.match(read("src/app/dashboard/programs/[id]/customers/page.tsx"), /uuid:\s*id,\s*businessId:\s*user\.businessId/);
});

test("Staff and Branch Manager cannot scan another business QR", () => {
  const scanPage = read("src/app/scan/[token]/page.tsx");
  const scanActions = read("src/app/scan/actions.ts");

  assert.match(scanPage, /businessMembership\.businessId !== authUser\.businessId/);
  assert.match(scanPage, /WRONG_BUSINESS/);
  assert.match(scanActions, /businessMembership\.businessId !== user\.businessId/);
  assert.match(scanActions, /This loyalty QR does not belong to your business/);
});

test("Branch Manager cannot enroll customers into another business program", () => {
  const branchProgramActions = read("src/app/branch/programs/actions.ts");
  assert.match(branchProgramActions, /uuid:\s*programUuid,\s*businessId:\s*user\.businessId,\s*active:\s*true/);
  assert.match(branchProgramActions, /uuid:\s*membershipUuid,[\s\S]*businessId:\s*user\.businessId/);
});

test("Business Owner alerts, billing, and activity are tenant filtered", () => {
  assert.match(read("src/app/dashboard/notifications/[id]/page.tsx"), /id:\s*alertId,\s*businessId:\s*user\.businessId/);
  assert.match(read("src/app/dashboard/notifications/actions.ts"), /id:\s*parsed\.data\.alertId,[\s\S]*businessId:\s*user\.businessId/);
  assert.match(read("src/app/dashboard/billing/page.tsx"), /where:\s*{\s*businessId:\s*user\.businessId\s*}/);
  assert.match(read("src/app/dashboard/activity/[id]/page.tsx"), /id:\s*transactionId,\s*businessId:\s*user\.businessId/);
});

test("Business Owner cannot redeem another business reward", () => {
  const scanActions = read("src/app/scan/actions.ts");
  assert.match(scanActions, /businessMembership\.businessId !== user\.businessId/);
  assert.match(scanActions, /lockedMembership\.businessCustomerMembership\.businessId !== user\.businessId/);
});
