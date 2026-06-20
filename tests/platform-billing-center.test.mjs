import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("billing center provides commercial dashboard, filters, lifecycle views, exports, and platform-owner protection", () => {
  const page = read("src/app/platform/billing-center/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");

  for (const expected of [
    "Billing Center",
    "Monthly Revenue (MRR)",
    "Annual Revenue Projection (ARR)",
    "Active Subscriptions",
    "Trial Subscriptions",
    "Expiring Within 30 Days",
    "Overdue Invoices",
    "Suspended Accounts",
    "Cancelled Subscriptions",
    "Revenue Summary Panel",
    "Monthly Revenue Trend",
    "Subscription Growth Trend",
    "Business Growth Trend",
    "Plan Distribution",
    "Revenue by Plan",
    "Renewal Forecast",
    "Subscription Management",
    "Renewal Center",
    "Trial Management",
    "Plan Performance",
    "Invoice Management",
    "Payment Tracking",
    "Churn Analytics",
    "Billing Alerts",
    "Billing Health Score",
    "Global Filters",
    "CSV",
    "Excel",
    "PDF",
    "requireRole(\"PLATFORM_OWNER\")",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[()"]/g, "\\$&")));
  }

  assert.match(shell, /\/platform\/billing-center/);
  assert.match(shell, /CircleDollarSign/);
});

test("platform business detail includes billing profile without changing business logic", () => {
  const businessDetail = read("src/app/platform/businesses/[id]/page.tsx");

  for (const expected of [
    "Billing Tab",
    "Business billing profile",
    "Current Plan",
    "Subscription Status",
    "Invoice History",
    "Payment History",
    "Renewal Date",
    "Lifetime Revenue",
    "Open Billing Center",
    "md:hidden",
    "hidden overflow-x-auto md:block",
    "grid grid-cols-2 gap-3",
    "MobileDetail",
    "min-h-11",
    "break-words",
  ]) {
    assert.match(businessDetail, new RegExp(expected));
  }
});
