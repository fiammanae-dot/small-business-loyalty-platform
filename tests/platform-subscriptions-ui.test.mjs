import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform subscriptions page uses compact toolbar, dropdown actions, badges, and mobile cards", () => {
  const page = read("src/app/platform/subscriptions/page.tsx");

  for (const expected of [
    "Business subscriptions",
    "Apply filters",
    "Clear filters",
    "Showing {subscriptions.length} subscriptions",
    "Manage",
    "More",
    "Start Trial",
    "Extend",
    "Test/Demo Data",
    "SubscriptionCard",
    "CompactBadge",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }

  assert.match(page, /<details className=/);
  assert.match(page, /suspiciousBusinessNamePattern/);
  assert.match(page, /startTrialAction/);
  assert.match(page, /extendSubscriptionAction/);
  assert.match(page, /updateSubscriptionStatusAction/);
  assert.match(page, /href="\/platform\/subscriptions"/);
});
