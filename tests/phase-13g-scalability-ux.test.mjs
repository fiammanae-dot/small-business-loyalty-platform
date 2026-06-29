import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("searchable combobox supports large-list usability requirements", () => {
  const combobox = read("src/components/SearchableCombobox.tsx");

  for (const expected of [
    "disabled?: boolean",
    "SearchableCombobox",
    "role=\"listbox\"",
    "aria-haspopup=\"listbox\"",
    "onKeyDown",
    "Loading options",
    "No results found.",
    "Clear",
    "max-h-[min(320px,45vh)]",
    "Showing first",
  ]) {
    assert.ok(combobox.includes(expected), `Missing combobox capability: ${expected}`);
  }
});

test("high-risk dynamic selectors use the reusable combobox", () => {
  const files = [
    "src/components/BusinessForm.tsx",
    "src/app/platform/businesses/page.tsx",
    "src/app/platform/users/page.tsx",
    "src/app/platform/invoices/page.tsx",
    "src/app/platform/subscriptions/page.tsx",
    "src/app/platform/audit-center/page.tsx",
    "src/app/platform/billing-center/page.tsx",
    "src/app/platform/tenant-center/page.tsx",
    "src/app/dashboard/staff/page.tsx",
    "src/app/dashboard/customers/new/page.tsx",
    "src/app/dashboard/programs/[id]/customers/page.tsx",
    "src/app/branch/programs/[id]/customers/page.tsx",
    "src/app/dashboard/notifications/page.tsx",
    "src/app/dashboard/engagement/page.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    if (file === "src/components/BusinessForm.tsx") {
      assert.match(source, /PlanBillingCycleFields/, `${file} should use the plan combobox wrapper`);
      assert.match(read("src/components/PlanBillingCycleFields.tsx"), /SearchableCombobox/, "PlanBillingCycleFields should use SearchableCombobox");
    } else if (file === "src/app/dashboard/customers/new/page.tsx") {
      assert.match(source, /CustomerCreateForm/, `${file} should use the shared customer create form`);
      assert.match(read("src/components/CustomerCreateForm.tsx"), /SearchableCombobox/, "CustomerCreateForm should use SearchableCombobox");
    } else {
      assert.match(source, /SearchableCombobox/, `${file} should use SearchableCombobox`);
    }
  }
});

test("high-risk pages no longer use native selects for large record datasets", () => {
  const disallowed = [
    ["src/app/platform/invoices/page.tsx", "<select name=\"business\""],
    ["src/app/platform/invoices/page.tsx", "<select name=\"plan\""],
    ["src/app/platform/users/page.tsx", "<select name=\"business\""],
    ["src/app/platform/users/page.tsx", "<select name=\"branch\""],
    ["src/app/platform/businesses/page.tsx", "<select name=\"plan\""],
    ["src/app/platform/subscriptions/page.tsx", "<select name=\"plan\""],
    ["src/app/platform/audit-center/page.tsx", "<select name=\"business\""],
    ["src/app/platform/audit-center/page.tsx", "<select name=\"branch\""],
    ["src/app/platform/billing-center/page.tsx", "<select name=\"business\""],
    ["src/app/platform/billing-center/page.tsx", "<select name=\"plan\""],
    ["src/app/platform/tenant-center/page.tsx", "<select name=\"plan\""],
    ["src/app/dashboard/staff/page.tsx", "<select name=\"branchId\""],
    ["src/app/dashboard/customers/new/page.tsx", "<select name=\"createdBranchId\""],
    ["src/app/dashboard/programs/[id]/customers/page.tsx", "<select name=\"membershipUuid\""],
    ["src/app/branch/programs/[id]/customers/page.tsx", "<select name=\"membershipUuid\""],
    ["src/app/dashboard/notifications/page.tsx", "<select name=\"assignedUser\""],
    ["src/app/dashboard/notifications/page.tsx", "<select name=\"branch\""],
    ["src/app/dashboard/notifications/page.tsx", "<select name=\"assignedToUserId\""],
    ["src/app/dashboard/engagement/page.tsx", "<select name=\"branch\""],
    ["src/app/dashboard/engagement/page.tsx", "<select name=\"program\""],
  ];

  for (const [file, selector] of disallowed) {
    assert.ok(!read(file).includes(selector), `${file} still contains large native selector ${selector}`);
  }
});

test("business owner customer search is ready for customer volume and direct navigation", () => {
  const customers = read("src/app/dashboard/customers/page.tsx");

  for (const expected of [
    "Search by name, phone number, referral code or card number...",
    "globalCustomer: { email",
    "programMemberships: {",
    "loyaltyProgram: { name",
    "createdBranch",
    "referralCode",
    "href={`/dashboard/customers/${row.raw.uuid}`}",
  ]) {
    assert.ok(customers.includes(expected), `Customers page search missing: ${expected}`);
  }
});

test("phase 13g scalability audit reports are present", () => {
  const reports = [
    "docs/audits/scalability-ux-dropdown-audit.md",
    "docs/audits/scalability-ux-table-audit.md",
    "docs/audits/action-discoverability-audit.md",
    "docs/audits/performance-risk-review.md",
  ];

  for (const report of reports) {
    assert.ok(existsSync(report), `${report} should exist`);
    const content = read(report);
    assert.match(content, /Risk|Recommended|Phase 13G/i);
  }
});
