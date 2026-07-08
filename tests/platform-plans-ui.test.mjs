import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform plans page exposes KPI cards, search, sorting, plan cards, and detailed table", () => {
  const page = read("src/app/platform/plans/page.tsx");

  for (const expected of [
    "Total Plans",
    "Active Subscriptions",
    "Most Popular Plan",
    "Recurring Revenue",
    "Search plan name",
    "activeSubscriptions: \"Active subscriptions\"",
    "businesses: \"Businesses using plan\"",
    "revenue: \"Revenue\"",
    "Sort by \\{label\\.toLowerCase\\(\\)\\}",
    "function PlanCard",
    "Adoption",
    "AnalysisRow",
    "Plan comparison",
    "System Administrator",
    "requireRole\\(\"PLATFORM_OWNER\"\\)",
  ]) {
    assert.match(page, new RegExp(expected));
  }

  assert.doesNotMatch(page, /Monthly Revenue/);
});
