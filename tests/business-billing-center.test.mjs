import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("business owner billing page uses Billing & Plan Center structure", () => {
  const page = read("src/app/dashboard/billing/page.tsx");

  for (const expected of [
    "Billing & Plan",
    "Manage your subscription, plan usage and billing history.",
    "Upgrade Plan / Manage Plan",
    "Current Plan Summary",
    "Subscription Health",
    "Plan Usage",
    "Billing History",
    "Upgrade Guidance",
    "No billing history yet.",
  ]) {
    assert.ok(page.includes(expected), `Missing billing center text: ${expected}`);
  }
});

test("business owner billing page uses design system billing components", () => {
  const page = read("src/app/dashboard/billing/page.tsx");

  for (const component of ["PageHeader", "MetricCard", "SectionCard", "ProgressBar", "StatusBadge", "DataTable", "EmptyState", "ButtonLink"]) {
    assert.match(page, new RegExp(component), `Billing page should use ${component}`);
  }

  assert.match(page, /Branches used/);
  assert.match(page, /Programs used/);
  assert.match(page, /usageTone/);
  assert.match(page, /business\._count\.branches/);
  assert.match(page, /business\._count\.loyaltyPrograms/);
});

test("business owner billing page remains UI-only and mobile safe", () => {
  const page = read("src/app/dashboard/billing/page.tsx");

  assert.match(page, /lg:hidden/);
  assert.match(page, /hidden lg:block/);
  assert.match(page, /overflow-x-hidden/);
  assert.doesNotMatch(page, /JSON\.stringify|debug payload|raw uuid/i);
  assert.doesNotMatch(page, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.doesNotMatch(page, /prisma\.[a-zA-Z0-9_]+\.(create|update|delete|upsert|deleteMany|updateMany)\(/, "Billing redesign should not add Prisma mutation calls");
});

