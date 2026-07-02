import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform businesses page exposes filtering, sorting, badges, and mobile cards", () => {
  const page = read("src/app/platform/businesses/page.tsx");

  for (const expected of [
    "Search",
    "Business type",
    "Status",
    "Plan",
    "Created from",
    "Created to",
    "Min branches",
    "Max branches",
    "Sort by",
    "Clear filters",
    "Showing {businesses.length} businesses",
    "Review flagged",
    "BusinessMobileCard",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }

  for (const expected of ["demo", "test", "phase", "debug", "updated", "\\\\d\\{10,\\}"]) {
    assert.match(page, new RegExp(expected, "i"));
  }

  assert.match(page, /subscriptionPlanId: selectedPlanId/);
  assert.match(page, /business\._count\.branches >= minBranches/);
  assert.match(page, /business\._count\.branches <= maxBranches/);
  assert.match(page, /sort === "plan"/);
  assert.match(page, /sort === "branches"/);
  assert.doesNotMatch(page, /"Created date", "Actions"/);
  assert.doesNotMatch(page, /BusinessActions/);
  assert.match(page, /href=\{`\/platform\/businesses\/\$\{business\.uuid\}`\}/);
  assert.match(page, /Open \$\{business\.name\} business details/);
});
