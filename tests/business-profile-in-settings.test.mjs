/**
 * The business name and type are set by the platform (System Administrator)
 * when the business is created. Business owners see both in Settings but
 * cannot change either; the separate /dashboard/profile page is gone.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the Settings Business Profile section shows name and type read-only", () => {
  const settings = read("src/app/dashboard/settings/page.tsx");
  assert.doesNotMatch(settings, /updateBusinessProfileAction/);
  assert.doesNotMatch(settings, /name="name" defaultValue=\{business\.name\}/);
  assert.doesNotMatch(settings, /name="businessType"/);
  assert.doesNotMatch(settings, /Save business profile/);
  assert.match(settings, /\{business\.name\}\s*<\/div>/);
  assert.match(settings, /To change your business name, contact Loyalty Card UAE support\./);
  assert.match(settings, /To change your business type, contact Loyalty Card UAE support\./);
});

test("there is no owner action that renames the business", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.doesNotMatch(actions, /updateBusinessProfileAction/);
  assert.doesNotMatch(actions, /dashboard:business-profile/);
  // Only the System Administrator's business form writes the name (and syncs wallets after).
  const admin = read("src/app/platform/businesses/actions.ts");
  assert.match(admin, /hasWalletRelevantBusinessChange\(/);
  assert.match(admin, /enqueueWalletSyncForBusiness\(\{ businessId: data\.businessId, trigger: "admin-business-form" \}\)/);
});

test("the standalone Business profile page and nav link are gone", () => {
  assert.ok(!existsSync("src/app/dashboard/profile/page.tsx"), "profile page removed");
  const nav = read("src/components/RoleNavigation.tsx");
  assert.doesNotMatch(nav, /\/dashboard\/profile/);
});
