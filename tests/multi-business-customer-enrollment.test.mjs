import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("customer enrollment stores business-scoped profile data and only blocks duplicate membership in the same business", () => {
  const customers = read("src/lib/customers.ts");
  const schema = read("prisma/schema.prisma");
  const publicCard = read("src/app/card/[token]/page.tsx");
  const customerList = read("src/app/dashboard/customers/page.tsx");

  assert.match(customers, /findGlobalCustomerForEnrollment/);
  assert.match(customers, /tx\.globalCustomer\.findUnique\(\{\s*where: \{ normalizedPhone \}/s);
  assert.match(customers, /tx\.globalCustomer\.findFirst\(\{\s*where: \{ email: \{ equals: trimmedEmail, mode: "insensitive" \} \}/s);
  assert.match(customers, /OR:\s*\[\s*\{\s*normalizedPhone\s*\}/s);
  assert.match(schema, /model BusinessCustomerMembership[\s\S]*firstName\s+String\s+@map\("first_name"\)[\s\S]*normalizedPhone\s+String\s+@map\("normalized_phone"\)[\s\S]*@@unique\(\[businessId, normalizedPhone\]\)/s);
  assert.match(customers, /if \(existingMembership\) return \{ duplicate: true/);
  assert.match(customers, /businessCustomerMembership\.create\(\{\s*data:\s*\{[\s\S]*firstName: identity\.data\.firstName[\s\S]*normalizedPhone/s);
  assert.match(customers, /This customer is already enrolled in your business\./);
  assert.match(publicCard, /membership\.firstName/);
  assert.match(publicCard, /membership\.normalizedPhone/);
  assert.match(customerList, /\{ firstName: \{ contains: query, mode: "insensitive" \} \}/);
  assert.doesNotMatch(customers, /This customer is already used by another business/i);
  assert.doesNotMatch(customers, /Customer already exists/i);
});

test("business owner, branch manager, and staff creation all use the shared enrollment helper", () => {
  for (const path of [
    "src/app/dashboard/actions.ts",
    "src/app/branch/customers/actions.ts",
    "src/app/staff/customers/actions.ts",
  ]) {
    const source = read(path);
    assert.match(source, /enrollCustomerForBusiness/);
    assert.match(source, /preserveFormState: true/);
  }
});

test("public join QR reuses existing business membership by phone and never creates stamps or rewards", () => {
  const action = read("src/app/join/program/[token]/actions.ts");

  assert.match(action, /globalCustomer\.findUnique\(\{\s*where: \{ normalizedPhone \}/s);
  assert.match(action, /businessId_normalizedPhone/);
  assert.match(action, /firstName: parsed\.data\.firstName/);
  assert.match(action, /programMemberships\.length === 0/);
  assert.match(action, /businessCustomerMembership\.create/);
  assert.doesNotMatch(action, /stampTransaction\.create/);
  assert.doesNotMatch(action, /rewardRedemption\.create/);
});

test("program enrollment pages enroll existing business customers instead of creating global duplicates", () => {
  for (const path of [
    "src/app/dashboard/programs/actions.ts",
    "src/app/branch/programs/actions.ts",
  ]) {
    const source = read(path);
    assert.match(source, /businessCustomerMembershipId/);
    assert.match(source, /customerProgramMembership/);
    assert.doesNotMatch(source, /globalCustomer\.create/);
  }
});
