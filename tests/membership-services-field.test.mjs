/**
 * Membership "add service" is a repeatable field: the create wizard shows one
 * treatment input and an "Add service" button that appends another, and every
 * row submits under the same `membershipTreatments` name. The server reads them
 * all with getAll. Staff then pick from this list at the counter (the scan
 * dropdown already exists), and each visit draws down one session.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the create wizard offers a repeatable add-service field", () => {
  const wiz = read("src/components/ProgramCreateWizard.tsx");
  assert.match(wiz, /function MembershipServicesField\(\)/);
  // Dynamic list state, add and remove.
  assert.match(wiz, /useState<string\[\]>\(\[""\]\)/);
  assert.match(wiz, /const addService = \(\)/);
  assert.match(wiz, /const removeService = \(index: number\)/);
  // The visible "add another" affordance.
  assert.match(wiz, /\+ Add service/);
  // Every row submits under the same name so the server collects them all.
  assert.match(wiz, /name="membershipTreatments"/);
  // The old single textarea is gone.
  assert.doesNotMatch(wiz, /<textarea name="membershipTreatments"/);
  // The field is rendered in the membership section.
  assert.match(wiz, /<MembershipServicesField \/>/);
});

test("the create action reads every repeated service row", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");
  assert.match(actions, /function getStringList\(formData: FormData, key: string\)/);
  assert.match(actions, /\.getAll\(key\)/);
  assert.match(actions, /membershipTreatments: getStringList\(formData, "membershipTreatments"\)/);
});
