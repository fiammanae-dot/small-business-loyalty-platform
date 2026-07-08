import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform audit center provides monitoring KPIs, filters, drawer, exports, timeline, and summaries", () => {
  const page = read("src/app/platform/audit-center/page.tsx");
  const nav = read("src/components/RoleNavigation.tsx");

  for (const expected of [
    "Audit Center",
    "Security Events",
    "Administrative Changes",
    "Business Actions",
    "Subscription Actions",
    "Cooldown overrides",
    "More filters",
    "Search user, business, email, event ID, entity ID",
    "All event types",
    "All severities",
    "IP address",
    "Event details",
    "Before value",
    "After value",
    "Metadata",
    "Security &amp; health",
    "Failed login attempts",
    "Restricted action attempts",
    "Export CSV",
    "Export Excel",
    "Export PDF",
    "Event stream",
    "Most active businesses",
    "Most active users",
    "requireRole(\"PLATFORM_OWNER\")",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[()"]/g, "\\$&")));
  }

  assert.match(nav, /\/platform\/audit-center/);
  assert.match(nav, /ClipboardList/);
});
