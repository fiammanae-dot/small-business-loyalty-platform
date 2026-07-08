import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("business owner settings page uses Business Control Center structure", () => {
  const page = read("src/app/dashboard/settings/page.tsx");

  for (const expected of [
    "Business Settings",
    "Manage your business configuration, preferences and security.",
    "Business Profile",
    "Security",
    "Notifications",
    "Branding",
    "Preferences",
    "Integrations",
    "Advanced",
    "Danger Zone",
  ]) {
    assert.ok(page.includes(expected), `Missing settings center text: ${expected}`);
  }
});

test("business owner settings page uses design-system foundations and preserves existing settings actions", () => {
  const page = read("src/app/dashboard/settings/page.tsx");

  for (const component of ["PageIntro", "SectionCard", "MetricCard", "StatusBadge", "ButtonLink", "EmptyState"]) {
    assert.match(page, new RegExp(component), `Settings page should use ${component}`);
  }

  for (const action of ["saveCustomerTierSettingsAction", "saveScannerSettingsAction", "saveAbusePolicyAction", "saveCooldownRuleAction"]) {
    assert.match(page, new RegExp(action), `Settings page should preserve ${action}`);
  }
});

test("business owner settings page is responsive and avoids debug data", () => {
  const page = read("src/app/dashboard/settings/page.tsx");

  assert.match(page, /aria-label="Settings categories"/, "Settings page should expose a categories nav for switching sections on mobile");
  assert.match(page, /overflow-x-auto border-b border-\[#E5E7EB\] \[scrollbar-gutter:stable\]/, "Settings categories nav should scroll horizontally on mobile instead of overflowing");
  assert.match(page, /md:grid/);
  assert.match(page, /overflow-x-hidden/);
  assert.doesNotMatch(page, /JSON\.stringify|debug payload|raw uuid/i);
  assert.doesNotMatch(page, /Business UUID|business\.uuid/);
  assert.doesNotMatch(page, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});
