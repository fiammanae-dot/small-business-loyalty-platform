/**
 * Business name/type editing lives only in Settings now; the separate
 * /dashboard/profile page and its nav link are removed.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the Settings Business Profile section edits the name; business type is read-only", () => {
  const settings = read("src/app/dashboard/settings/page.tsx");
  assert.match(settings, /<form action=\{updateBusinessProfileAction\}/);
  assert.match(settings, /<CsrfInput scope="dashboard:business-profile" \/>/);
  assert.match(settings, /name="name" defaultValue=\{business\.name\}/);
  // Owners cannot change their business type (only the platform can).
  assert.doesNotMatch(settings, /name="businessType"/);
  assert.match(settings, /To change your business type, contact Loyalty Card UAE support\./);
  const actions = read("src/app/dashboard/actions.ts");
  const profileAction = actions.slice(actions.indexOf("export async function updateBusinessProfileAction"), actions.indexOf("export async function saveBranchAction"));
  assert.doesNotMatch(profileAction, /businessType/);
});

test("the standalone Business profile page and nav link are gone", () => {
  assert.ok(!existsSync("src/app/dashboard/profile/page.tsx"), "profile page removed");
  const nav = read("src/components/RoleNavigation.tsx");
  assert.doesNotMatch(nav, /\/dashboard\/profile/);
});

test("the profile action redirects to Settings now", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /export async function updateBusinessProfileAction/);
  assert.doesNotMatch(actions, /\/dashboard\/profile/);
  assert.match(actions, /redirect\("\/dashboard\/settings\?success=Business profile updated\."\)/);
});
