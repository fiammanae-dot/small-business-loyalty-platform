import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("UAE phone helper normalizes common mobile formats and rejects invalid numbers", () => {
  const phone = read("src/lib/phone.ts");

  for (const expected of [
    "05",
    "9715",
    "00971",
    "return `+${digits}`",
    "formatUaePhoneDisplay",
    "formatUaePhoneForWhatsApp",
  ]) {
    assert.match(phone, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(phone, /digits\.startsWith\("9715"\)/);
  assert.match(phone, /digits\.length !== 12/);
  assert.match(phone, /return null/);
});

test("customer creation stores normalized phone and uses it for duplicate detection", () => {
  const customers = read("src/lib/customers.ts");
  const actions = read("src/app/dashboard/actions.ts");
  const editPage = read("src/app/dashboard/customers/[id]/edit/page.tsx");

  assert.match(customers, /const normalizedPhone = normalizePhone\(identity\.data\.phone\)/);
  assert.match(customers, /Enter a valid UAE mobile number/);
  assert.match(customers, /where: \{ normalizedPhone \}/);
  assert.match(customers, /phone: normalizedPhone/);
  assert.match(customers, /businessId_globalCustomerId/);
  assert.match(actions, /const normalizedPhone = normalizePhone\(identity\.data\.phone\)/);
  assert.match(actions, /This phone number is already enrolled in your business/);
  assert.match(actions, /phone: normalizedPhone/);
  assert.match(editPage, /name="phone"/);
  assert.doesNotMatch(editPage, /name="phone"[^>]+disabled/);
});

test("customer search accepts local and international UAE phone formats", () => {
  const dashboardCustomers = read("src/app/dashboard/customers/page.tsx");
  const branchCustomers = read("src/app/branch/customers/page.tsx");
  const dashboard = read("src/app/page.tsx");

  for (const source of [dashboardCustomers, branchCustomers, dashboard]) {
    assert.match(source, /normalizePhone/);
    assert.match(source, /normalizedPhone/);
    assert.match(source, /formatUaePhoneDisplay/);
  }
});

test("WhatsApp manual links use wa.me with UAE digits only", () => {
  const messages = read("src/lib/messages.ts");

  assert.match(messages, /formatUaePhoneForWhatsApp/);
  assert.match(messages, /https:\/\/wa\.me\/\$\{normalized\}/);
  assert.doesNotMatch(messages, /phone\.replace/);
});
