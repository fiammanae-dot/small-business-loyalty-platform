import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform subscriptions page uses compact toolbar, directory rows, badges, and mobile cards", () => {
  const page = read("src/app/platform/subscriptions/page.tsx");
  const detail = read("src/app/platform/businesses/[id]/page.tsx");

  for (const expected of [
    "Business subscriptions",
    "Active Subscriptions",
    "Trial Subscriptions",
    "Expiring Within 30 Days",
    "Suspended Subscriptions",
    "Apply filters",
    "Clear filters",
    "Showing {subscriptions.length} subscriptions",
    "Review flagged",
    "SubscriptionCard",
    "CompactBadge",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }

  assert.match(page, /Open \$\{subscription\.business\.name\} subscription details/);
  assert.match(page, /href=\{`\/platform\/businesses\/\$\{subscription\.business\.uuid\}`\}/);
  assert.doesNotMatch(page, /"Actions"/);
  assert.doesNotMatch(page, /SubscriptionActions/);
  assert.doesNotMatch(page, /startTrialAction/);
  assert.doesNotMatch(page, /extendSubscriptionAction/);
  assert.doesNotMatch(page, /updateSubscriptionStatusAction/);
  assert.doesNotMatch(page, /<details className=/);
  assert.doesNotMatch(page, /min-w-\[1080px\]/);
  assert.doesNotMatch(page, /overflow-x-auto/);
  assert.match(page, /suspiciousBusinessNamePattern/);
  assert.match(page, /href="\/platform\/subscriptions"/);
  assert.match(detail, /SubscriptionActionsPanel/);
  assert.match(detail, /Start Trial/);
  assert.match(detail, /Extend/);
  assert.match(detail, /Audit history/);
});
