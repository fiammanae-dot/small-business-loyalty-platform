import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform audit center provides monitoring KPIs, filters, drawer, exports, timeline, and summaries", () => {
  const page = read("src/app/platform/audit-center/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");

  for (const expected of [
    "Audit Center",
    "Total Audit Events",
    "Last 24 Hours Events",
    "Security Events",
    "Administrative Changes",
    "Business Actions",
    "Subscription Actions",
    "Cooldown Overrides",
    "Failed Actions",
    "Advanced Filters",
    "Search user, business, email, event ID, entity ID",
    "Date & Time",
    "Event Type",
    "Severity",
    "IP Address",
    "Audit Event Details Drawer",
    "Before Value",
    "After Value",
    "Metadata",
    "Security Monitoring Section",
    "Failed Login Attempts",
    "Demo Mode Violations",
    "Export CSV",
    "Export Excel",
    "Export PDF",
    "Audit Timeline View",
    "Most Active Businesses",
    "Most Active Users",
    "System Health Audit Panel",
    "requireRole(\"PLATFORM_OWNER\")",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[()"]/g, "\\$&")));
  }

  assert.match(shell, /\/platform\/audit-center/);
  assert.match(shell, /ClipboardList/);
});
