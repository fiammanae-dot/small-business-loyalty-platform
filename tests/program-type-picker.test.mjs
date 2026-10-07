/**
 * Multi-type program creation: the picker (Stamp, Membership, Cashback) is
 * the entry point at /dashboard/programs/new.
 * Stamp/Membership route into the existing wizard, locked to that type;
 * Cashback/Tier point at their Settings sections until their own flows land.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the program type picker offers stamp, membership and cashback (tier is not a program type)", () => {
  const picker = read("src/components/ProgramTypePicker.tsx");
  assert.match(picker, /\/dashboard\/programs\/new\?type=stamp/);
  assert.match(picker, /\/dashboard\/programs\/new\?type=membership/);
  assert.match(picker, /\/dashboard\/programs\/new\?type=cashback/); // cashback
  for (const label of ["Stamp card", "Membership", "Cashback"]) {
    assert.ok(picker.includes(label), `missing ${label}`);
  }
  // Tiers are an option inside stamp programs, not a standalone program type.
  assert.doesNotMatch(picker, /\?type=tier/);
  assert.doesNotMatch(picker, /title: "Tiers"/);
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

test("phase 2: the cashback setup flow is wired to the business-wide cashback settings", () => {
  const page = read("src/app/dashboard/programs/new/page.tsx");
  assert.match(page, /if \(params\.type === "cashback"\)/);
  assert.match(page, /<CashbackSetupForm/);

  const form = read("src/components/CashbackSetupForm.tsx");
  assert.match(form, /saveCashbackSettingsAction/);
  assert.match(form, /name="redirectTo" value="\/dashboard\/programs"/);
  assert.match(form, /scope="dashboard:cashback-settings"/);

  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /const redirectTo = safeDashboardPath\(getString\(formData, "redirectTo"\)\);/);
  assert.match(actions, /if \(redirectTo\) \{\s*redirect\(`\$\{redirectTo\}\?success=/);

  const programs = read("src/app/dashboard/programs/page.tsx");
  assert.match(programs, /FeatureStatusCard[\s\S]*title="Cashback"/);
});

test("tiers are not a create-program type; they are configured in Settings", () => {
  // Tier is an option inside stamp programs, not something you "create" here.
  const page = read("src/app/dashboard/programs/new/page.tsx");
  assert.doesNotMatch(page, /params\.type === "tier"/);
  assert.doesNotMatch(page, /TierSetupForm/);

  // Tiers stay configurable business-wide in Settings.
  const settings = read("src/app/dashboard/settings/page.tsx");
  assert.match(settings, /<CustomerTiersSection tierConfig=\{tierConfig\} \/>/);

  // The Programs page still surfaces tier status under business-wide features.
  const programs = read("src/app/dashboard/programs/page.tsx");
  assert.match(programs, /FeatureStatusCard[\s\S]*title="Tiers"/);
});

test("phase 3: tiers are no longer hidden when memberships are enabled (layered)", () => {
  const settings = read("src/app/dashboard/settings/page.tsx");
  assert.doesNotMatch(settings, /membershipsEnabled \? null : <CustomerTiersSection/);
  assert.match(settings, /<CustomerTiersSection tierConfig=\{tierConfig\} \/>/);
});

test("phase 4: Programs page groups the business-wide features in a titled card", () => {
  const programs = read("src/app/dashboard/programs/page.tsx");
  assert.match(programs, /<SectionCard title="Business-wide features"/);
  // both feature cards live inside that card
  assert.match(programs, /Business-wide features[\s\S]*title="Cashback"[\s\S]*title="Tiers"[\s\S]*<\/SectionCard>/);
});
