/**
 * Phase 1 of the multi-type program creation: a 4-way picker (Stamp,
 * Membership, Cashback, Tier) is the entry point at /dashboard/programs/new.
 * Stamp/Membership route into the existing wizard, locked to that type;
 * Cashback/Tier point at their Settings sections until their own flows land.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the program type picker offers all four program types", () => {
  const picker = read("src/components/ProgramTypePicker.tsx");
  assert.match(picker, /\/dashboard\/programs\/new\?type=stamp/);
  assert.match(picker, /\/dashboard\/programs\/new\?type=membership/);
  assert.match(picker, /\/dashboard\/settings\?tab=features/); // cashback
  assert.match(picker, /\/dashboard\/settings\?tab=loyalty/); // tiers
  for (const label of ["Stamp card", "Membership", "Cashback", "Tiers"]) {
    assert.ok(picker.includes(label), `missing ${label}`);
  }
});

test("the new-program page shows the picker by default and locks the wizard to the chosen type", () => {
  const page = read("src/app/dashboard/programs/new/page.tsx");
  assert.match(page, /const lockedType = params\.type === "membership" \? "membership" : params\.type === "stamp" \? "stamp" : null;/);
  assert.match(page, /if \(!lockedType\) \{[\s\S]*<ProgramTypePicker \/>/);
  assert.match(page, /lockedType=\{lockedType\}/);
});

test("the wizard hides its type toggle when the type is locked by the picker", () => {
  const wiz = read("src/components/ProgramCreateWizard.tsx");
  assert.match(wiz, /lockedType\?: "stamp" \| "membership";/);
  assert.match(wiz, /useState\(lockedType === "membership"\)/);
  assert.match(wiz, /\{membershipsEnabled && !lockedType \?/);
});

test("creating a membership program enables the membership feature for the business", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");
  assert.match(actions, /if \(parsed\.data\.isMembership\) \{[\s\S]*businessMembershipSettings\.upsert/);
});
