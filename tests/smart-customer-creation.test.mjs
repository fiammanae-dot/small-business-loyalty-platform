import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("customer creation handles active program count with a shared enrollment helper", () => {
  const customers = read("src/lib/customers.ts");

  assert.match(customers, /createCustomerProgramMembershipForEnrollment/);
  assert.match(customers, /selectedProgramUuid/);
  assert.match(customers, /activePrograms\.length === 1/);
  assert.match(customers, /activePrograms\.find\(\(program\) => program\.uuid === selectedProgramUuid\)/);
  assert.match(customers, /Select an active loyalty program for this customer\./);
  assert.match(customers, /programEnrollmentStatus: CustomerProgramEnrollmentStatus = "NO_ACTIVE_PROGRAM"/);
  assert.match(customers, /programEnrollmentStatus = "ENROLLED"/);
  assert.match(customers, /scanToken: generateScanToken\(\)/);
  assert.match(customers, /eventType: "WELCOME_CUSTOMER"/);
  assert.doesNotMatch(customers, /stampTransaction\.create/);
  assert.doesNotMatch(customers, /rewardRedemption\.create/);
});

test("customer create actions return state-specific success messages", () => {
  for (const path of [
    "src/app/dashboard/actions.ts",
    "src/app/branch/customers/actions.ts",
    "src/app/staff/customers/actions.ts",
  ]) {
    const source = read(path);
    assert.match(source, /selectedProgramUuid/);
    assert.match(source, /Customer created and enrolled successfully\./);
    assert.match(source, /Customer created successfully\. No active loyalty program is available for enrollment\./);
  }
});

test("customer create forms expose smart program enrollment states", () => {
  for (const path of [
    "src/app/dashboard/customers/new/page.tsx",
    "src/app/branch/customers/new/page.tsx",
    "src/app/staff/customers/new/page.tsx",
  ]) {
    const page = read(path);
    assert.match(page, /activePrograms/);
    assert.match(page, /Customer card will be created now\. No active loyalty program is available for enrollment\./);
    assert.match(page, /Customer will be enrolled into/);
    assert.match(page, /name="selectedProgramUuid"/);
    assert.match(page, /required/);
    assert.match(page, /where: \{ businessId: user\.businessId, active: true \}/);
  }
});

test("staff and branch customer creation do not expose program management", () => {
  const staffPage = read("src/app/staff/customers/new/page.tsx");
  const branchPage = read("src/app/branch/customers/new/page.tsx");

  for (const source of [staffPage, branchPage]) {
    assert.doesNotMatch(source, /Create Program/);
    assert.doesNotMatch(source, /\/edit/);
    assert.doesNotMatch(source, /toggleProgramAction/);
  }
});
