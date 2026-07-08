import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform analytics page includes charts, top business tables, exports, and platform-owner protection", () => {
  const page = read("src/app/platform/health-analytics/page.tsx");

  for (const expected of [
    "requireRole\\(\"PLATFORM_OWNER\"\\)",
    "businessGrowthTrend",
    "customerGrowthTrend",
    "subscriptionGrowthTrend",
    "alertTrend",
    "topBusinessesByCustomers",
    "topBusinessesByScans",
    "topBusinessesByEnrollments",
    "LeaderboardTabs",
    "PDF",
    "Excel",
    "CSV",
    "aria-label=\"Platform overview\"",
    "aria-label=\"Loyalty activity\"",
    "aria-label=\"Security monitoring\"",
  ]) {
    assert.match(page, new RegExp(expected));
  }
});
