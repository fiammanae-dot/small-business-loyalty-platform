import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("program management has filters, KPIs, result counts, and mobile cards", () => {
  const programs = read("src/app/dashboard/programs/page.tsx");

  for (const expected of [
    "Active Programs",
    "Reward Ready",
    "Inactive Programs",
    "Search programs or rewards",
    "All statuses",
    "Clear Filters",
    "Showing {programs.length} programs",
    "lg:hidden",
  ]) {
    assert.match(programs, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }
});

test("notifications have alert governance filters and standardized KPIs", () => {
  const notifications = read("src/app/dashboard/notifications/page.tsx");

  for (const expected of [
    "Open Alerts",
    "High Risk",
    "Medium Risk",
    "Low Risk",
    "Branch Risk Overview",
    "workflowTabs",
    "All severities",
    "All owners",
    "All branches",
    "Showing {alerts.length} alerts",
    "Clear Filters",
    "Actions",
    "Investigate Alert",
  ]) {
    assert.match(notifications, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }
});

test("message outbox has filters, KPIs, result count, and mobile empty states", () => {
  const messages = read("src/app/dashboard/messages/page.tsx");

  for (const expected of [
    "Ready Messages",
    "Sent Manually",
    "Cancelled Messages",
    "Search customer, phone, or email",
    "All channels",
    "All events",
    "Showing {messages.length} messages",
    "No messages match these filters.",
    "lg:hidden",
  ]) {
    assert.match(messages, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }
});

test("platform invoices use compact controls, result counts, mobile cards, and action menu", () => {
  const invoices = read("src/app/platform/invoices/page.tsx");

  for (const expected of [
    "Clear Filters",
    "Showing {invoices.length} invoices",
    "InvoiceKpi",
    "InvoiceActions",
    "More",
    "lg:hidden",
    "No invoices match these filters.",
  ]) {
    assert.match(invoices, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }
});
