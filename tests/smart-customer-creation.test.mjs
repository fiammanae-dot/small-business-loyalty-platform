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
  const form = read("src/components/CustomerCreateForm.tsx");
  assert.match(form, /Customer card will be created now\. No active loyalty program is available for enrollment\./);
  assert.match(form, /Customer will be enrolled into/);
  assert.match(form, /name="selectedProgramUuid"/);
  assert.match(form, /required/);

  for (const path of [
    "src/app/dashboard/customers/new/page.tsx",
    "src/app/branch/customers/new/page.tsx",
    "src/app/staff/customers/new/page.tsx",
  ]) {
    const page = read(path);
    assert.match(page, /activePrograms/);
    assert.match(page, /CustomerCreateForm/);
    assert.match(page, /where: \{ businessId: user\.businessId, active: true \}/);
  }
});

test("create forms preserve submitted values after failed server actions", () => {
  const formState = read("src/lib/form-state.ts");
  const customerForm = read("src/components/CustomerCreateForm.tsx");
  const businessForm = read("src/components/BusinessForm.tsx");
  const customerHelper = read("src/lib/customers.ts");
  const businessActions = read("src/app/platform/businesses/actions.ts");

  assert.match(formState, /collectFormValues/);
  assert.match(formState, /passwordFields/);
  assert.match(customerForm, /useActionState/);
  assert.match(customerForm, /state\.values/);
  assert.match(customerForm, /CSS\.escape\(firstInvalidName\)/);
  assert.match(customerForm, /data-form-error-summary/);
  assert.match(customerForm, /aria-invalid=\{Boolean\(error\)\}/);
  assert.match(businessForm, /useActionState/);
  assert.match(businessActions, /passwordFields: \["temporaryPassword"\]/);
  assert.match(businessForm, /defaultValue=\{value\("ownerEmail"\)\}/);
  assert.match(customerHelper, /preserveFormState/);
  assert.match(customerHelper, /throwFormActionError/);
  assert.match(businessActions, /createBusinessFailure/);
  assert.match(businessActions, /Owner email is already in use\./);

  for (const path of [
    "src/app/dashboard/actions.ts",
    "src/app/branch/customers/actions.ts",
    "src/app/staff/customers/actions.ts",
  ]) {
    const source = read(path);
    assert.match(source, /PreservedFormState/);
    assert.match(source, /customerCreateFailure/);
    assert.match(source, /isFormActionError/);
    assert.match(source, /preserveFormState: true/);
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
