import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform analytics page includes charts, top business tables, exports, and platform-owner protection", () => {
  const page = read("src/app/platform/health-analytics/page.tsx");

  for (const expected of [
    "requireRole(\"PLATFORM_OWNER\")",
    "Business growth trend",
    "Customer growth trend",
    "Subscription growth trend",
    "Alert trend",
    "Plan distribution",
    "Top businesses by customers",
    "Top businesses by scans",
    "Top businesses by enrollments",
    "PDF",
    "Excel",
    "CSV",
    "Platform Overview",
    "Loyalty Activity",
    "Subscription Overview",
    "Security Monitoring",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[()"]/g, "\\$&")));
  }
});
