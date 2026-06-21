import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform dashboard uses SaaS admin hierarchy, KPIs, icons, and recent activity", () => {
  const page = read("src/app/platform/page.tsx");
  const cards = read("src/components/PlatformCards.tsx");
  const shell = read("src/components/DashboardShell.tsx");

  for (const expected of [
    "Platform Operations Center",
    "No trend data yet",
    "No revenue recorded yet",
    "Quick Actions",
    "Management",
    "Recent Activity",
    "Total Businesses",
    "Active Subscriptions",
    "Monthly Revenue",
    "Open Alerts",
    "All Activity",
    "Alerts",
    "Invoices",
    "Users",
    "Subscriptions",
    "24 Hours",
    "7 Days",
    "30 Days",
    "New Business",
    "Billing Center",
    "Create Plan",
    "Add User",
  ]) {
    assert.match(page, new RegExp(expected));
  }

  for (const expected of ["Building2", "Package", "CreditCard", "Receipt", "Users", "BarChart3", "Settings"]) {
    assert.match(page, new RegExp(expected));
  }

  assert.match(cards, /LucideIcon/);
  assert.doesNotMatch(page, /Platform Health/);
  assert.doesNotMatch(page, /PlatformHealthCard/);
  assert.doesNotMatch(page, /Platform Health Summary/);
  assert.doesNotMatch(page, /Operational indicators/);
  assert.doesNotMatch(page, /HealthMetric/);
  assert.match(shell, /headerAside/);
  assert.match(shell, /Welcome back/);
  assert.match(shell, /Dashboard/);
  assert.match(shell, /Businesses/);
  assert.match(shell, /Analytics/);
  assert.match(shell, /Audit Center/);
  assert.match(shell, /Billing Center/);
  assert.match(shell, /Tenant Center/);
});
