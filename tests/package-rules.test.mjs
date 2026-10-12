/**
 * Package rules chosen when creating a package: lifetime or with expiry (lose
 * one visit per missed month, or everything expires after N months), one visit
 * a month or more, and whether a treatment can be repeated.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");
const d = (value) => new Date(value);

test("package months run from the join date", async () => {
  const { packageMonthWindow } = await loadTs("src/lib/membership-sessions.ts");
  const joined = d("2026-01-10T09:00:00Z");
  const first = packageMonthWindow(joined, d("2026-02-09T12:00:00Z"));
  assert.equal(first.start.toISOString(), joined.toISOString());
  assert.equal(first.end.toISOString(), "2026-02-10T09:00:00.000Z");
  const second = packageMonthWindow(joined, d("2026-02-10T10:00:00Z"));
  assert.equal(second.start.toISOString(), "2026-02-10T09:00:00.000Z");
  // Short months clamp instead of spilling over.
  const clamped = packageMonthWindow(d("2026-01-31T09:00:00Z"), d("2026-03-01T10:00:00Z"));
  assert.equal(clamped.start.toISOString().slice(0, 10), "2026-02-28");
});

test("fixed-term packages expire on the end date and lose everything left once", async () => {
  const { packageExpiresAt, isPackageExpired, computeFixedTermForfeit } = await loadTs("src/lib/membership-sessions.ts");
  const joined = d("2026-01-10T09:00:00Z");
  const rules = { packageValidity: "FIXED_TERM", packageTermMonths: 6 };
  assert.equal(packageExpiresAt(rules, joined).toISOString(), "2026-07-10T09:00:00.000Z");
  assert.equal(isPackageExpired(rules, joined, d("2026-07-10T08:59:00Z")), false);
  assert.equal(isPackageExpired(rules, joined, d("2026-07-10T09:00:00Z")), true);
  // Lifetime and monthly packages have no end date.
  assert.equal(packageExpiresAt({ packageValidity: "LIFETIME", packageTermMonths: 6 }, joined), null);
  assert.equal(packageExpiresAt({ packageValidity: "MONTHLY_FORFEIT", packageTermMonths: null }, joined), null);

  const base = { enrolledAt: joined, termMonths: 6, requiredStamps: 6, earnedStamps: 2, sessionsForfeited: 0 };
  assert.deepEqual(computeFixedTermForfeit({ ...base, now: d("2026-07-09T00:00:00Z") }), { newSessionsForfeited: 0, forfeitedThisRun: 0, expired: false });
  assert.deepEqual(computeFixedTermForfeit({ ...base, now: d("2026-07-11T00:00:00Z") }), { newSessionsForfeited: 4, forfeitedThisRun: 4, expired: true });
  // Running again changes nothing.
  assert.deepEqual(computeFixedTermForfeit({ ...base, sessionsForfeited: 4, now: d("2026-07-12T00:00:00Z") }), { newSessionsForfeited: 4, forfeitedThisRun: 0, expired: true });
});

test("rules are described in plain words", async () => {
  const { describePackageRules } = await loadTs("src/lib/membership-sessions.ts");
  assert.deepEqual(
    describePackageRules({ packageValidity: "FIXED_TERM", packageTermMonths: 6, packageOneVisitPerMonth: true, packageUniqueTreatments: true }),
    ["Expires 6 months after joining - unused visits are lost.", "One visit per month.", "Each treatment can be used only once."],
  );
  assert.equal(
    describePackageRules({ packageValidity: "LIFETIME", packageTermMonths: null, packageOneVisitPerMonth: false, packageUniqueTreatments: false })[0],
    "Lifetime - visits never expire.",
  );
});

test("existing packages keep today's behaviour", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /packageValidity\s+PackageValidity @default\(MONTHLY_FORFEIT\)/);
  assert.match(schema, /packageOneVisitPerMonth\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /packageUniqueTreatments\s+Boolean\s+@default\(false\)/);
  const migration = read("prisma/migrations/0068_package_rules/migration.sql");
  assert.match(migration, /"package_validity" "PackageValidity" NOT NULL DEFAULT 'MONTHLY_FORFEIT'/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS/);
});

test("the owner sets the rules when creating a package and can change them later", () => {
  const wizard = read("src/components/ProgramCreateWizard.tsx");
  assert.match(wizard, /<SectionCard title="Package rules"[\s\S]*<PackageRulesFields \/>/);
  const fields = read("src/components/PackageRulesFields.tsx");
  for (const name of ["packageLifetime", "packageExpiryRule", "packageTermMonths", "packageVisitsPerMonth", "packageTreatments"]) {
    assert.match(fields, new RegExp(`name="${name}"`), name);
  }
  const form = read("src/lib/package-rules-form.ts");
  assert.match(form, /Enter how many months the package lasts \(1 to 60\)\./);
  assert.match(form, /context\.treatmentCount < context\.includedVisits/);
  const actions = read("src/app/dashboard/programs/actions.ts");
  assert.match(actions, /\.\.\.\(packageRules \?\? \{\}\),/);
  assert.match(actions, /export async function updatePackageRulesAction/);
  assert.match(actions, /action: "PACKAGE_RULES_UPDATED"/);
  const page = read("src/app/dashboard/programs/[id]/page.tsx");
  assert.match(page, /<form action=\{updatePackageRulesAction\}/);
  assert.match(page, /<CsrfInput scope="dashboard:package-rules" \/>/);
});

test("the scanner enforces the rules, with an owner/manager override that raises an alert", () => {
  const actions = read("src/app/scan/actions.ts");
  assert.match(actions, /if \(isPackageExpired\(pkg, termStart, nowForRules\)\)/);
  assert.match(actions, /This package allows one visit per month\./);
  assert.match(actions, /was already used in this package, and each treatment can be used only once\./);
  assert.match(actions, /const overriding = data\.overrideCooldown && canOverride && overrideReason\.length > 0;/);
  assert.match(actions, /alertType: "PACKAGE_RULE_OVERRIDE"/);
  assert.match(actions, /action: "PACKAGE_RULE_OVERRIDE"/);
  const page = read("src/app/scan/[token]/page.tsx");
  assert.match(page, /disabled=\{treatment\.used\}/);
  assert.match(page, /Already visited this month/);
  assert.match(read("src/lib/alert-labels.ts"), /PACKAGE_RULE_OVERRIDE: "Package rule overridden"/);
});

test("the daily job follows each package's rule", () => {
  const route = read("src/app/api/cron/membership-expiry/route.ts");
  assert.match(route, /if \(program\.packageValidity === "LIFETIME"\) continue;/);
  assert.match(route, /computeFixedTermForfeit\(\{/);
  assert.match(route, /computeMembershipForfeit\(\{/);
});

test("customers see when their package expires", () => {
  const card = read("src/app/card/[token]/page.tsx");
  assert.match(card, /`Valid until \$\{formatDate\(expiresAt\)\}`/);
  assert.match(card, /"Your visits never expire"/);
});

test("'Continue to card design' never creates the program from step 1", () => {
  const wizard = read("src/components/ProgramCreateWizard.tsx");
  assert.match(wizard, /if \(step !== 2\) event\.preventDefault\(\);/);
  assert.match(wizard, /key="program-continue" type="button"/);
  assert.match(wizard, /key="program-create" type="submit"/);
});
