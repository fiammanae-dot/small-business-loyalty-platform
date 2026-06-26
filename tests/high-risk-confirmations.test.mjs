import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("reusable confirmation submit button exists and submits the parent form after confirmation", () => {
  const component = read("src/components/ConfirmSubmitButton.tsx");
  assert.match(component, /ConfirmSubmitButton/);
  assert.match(component, /Cancel/);
  assert.match(component, /Confirm/);
  assert.match(component, /requestSubmit/);
});

test("scanner stamp and reward actions require confirmation", () => {
  const page = read("src/app/scan/[token]/page.tsx");
  assert.match(page, /This will add 1 visit to the customer\'s selected program\./);
  assert.match(page, /This will redeem the customer\'s available reward and reset progress for this program\./);
});

test("highest-risk business owner actions require confirmation", () => {
  const customerPage = read("src/app/dashboard/customers/[id]/page.tsx");
  const programPage = read("src/app/dashboard/programs/[id]/page.tsx");
  const branchesPage = read("src/app/dashboard/branches/page.tsx");
  const staffPage = read("src/app/dashboard/staff/page.tsx");
  const settingsPage = read("src/app/dashboard/settings/page.tsx");

  assert.match(customerPage, /Disable this customer card\? The QR code can no longer be scanned\./);
  assert.match(programPage, /Disable this loyalty program\? Customers will no longer earn stamps for it\./);
  assert.match(branchesPage, /Disable this branch\? Branch staff and scanner activity may be restricted\./);
  assert.match(staffPage, /Disable this user\? They will lose access to the business workspace\./);
  assert.match(settingsPage, /Save cooldown policy\? This affects future stamp issuance limits\./);
});

test("highest-risk System Administrator actions require confirmation", () => {
  const businessDetailPage = read("src/app/platform/businesses/[id]/page.tsx");
  const subscriptionsPage = read("src/app/platform/subscriptions/page.tsx");
  const invoicesPage = read("src/app/platform/invoices/page.tsx");
  const invoiceDetailPage = read("src/app/platform/invoices/[id]/page.tsx");

  assert.match(businessDetailPage, /Disable this business\? Owners, staff, scanners, and customer activity may be blocked\./);
  assert.match(businessDetailPage, /Enable this business and restore access\?/);
  assert.match(subscriptionsPage, /Suspend this subscription\? Business operations may be restricted\./);
  assert.match(subscriptionsPage, /Cancel this subscription\? This may block business access and billing lifecycle changes\./);
  assert.match(subscriptionsPage, /Activate this subscription now\?/);
  assert.match(invoicesPage, /Mark this invoice as paid\? Confirm payment was received\./);
  assert.match(invoicesPage, /Cancel this invoice\? This cannot be used for payment tracking afterward\./);
  assert.match(invoiceDetailPage, /Mark this invoice as paid\? Confirm payment was received\./);
  assert.match(invoiceDetailPage, /Cancel this invoice\? This cannot be used for payment tracking afterward\./);
  assert.match(invoiceDetailPage, /Record this payment amount against the invoice\?/);
});
