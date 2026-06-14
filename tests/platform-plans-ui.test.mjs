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
    "Monthly Revenue",
    "Search plan name",
    "Sort by active subscriptions",
    "Sort by businesses using plan",
    "Sort by revenue",
    "PlanCard",
    "Utilization",
    "Detailed Analysis",
    "Plan comparison table",
    "System Administrator",
    "requireRole(\"PLATFORM_OWNER\")",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[()"]/g, "\\$&")));
  }
});
