import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("demo mode is a global platform setting with explicit restriction copy", () => {
  const platformSettings = read("src/lib/platform-settings.ts");
  const settingsPage = read("src/app/platform/settings/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");

  assert.match(platformSettings, /where: \{ key: "demo_mode" \}/);
  assert.match(platformSettings, /demoModeRestrictions/);

  for (const expected of ["Demo Mode Status", "Demo Mode is intended for product demonstrations, staff training, QA testing, and user acceptance testing"]) {
    assert.match(settingsPage, new RegExp(expected));
  }

  assert.match(shell, /Demo Mode Active/);
  assert.match(shell, /External communications and selected production actions are restricted/);
});

test("demo mode changes and blocked external actions are audited server-side", () => {
  const platformSettings = read("src/lib/platform-settings.ts");
  const settingsActions = read("src/app/platform/settings/actions.ts");
  const messageActions = read("src/app/dashboard/messages/actions.ts");
  const invoiceActions = read("src/app/platform/invoices/actions.ts");

  assert.match(platformSettings, /blockDemoModeExternalAction/);
  assert.match(platformSettings, /DEMO_MODE_BLOCKED_ACTION/);
  assert.match(settingsActions, /DEMO_MODE_ENABLED/);
  assert.match(settingsActions, /DEMO_MODE_DISABLED/);
  assert.match(settingsActions, /logAuditEvent/);
  assert.match(messageActions, /blockDemoModeExternalAction/);
  assert.match(messageActions, /MESSAGE_SENT_MANUALLY/);
  assert.match(messageActions, /Demo Mode is active\. External communications and selected production actions are restricted\./);
  assert.match(invoiceActions, /blockDemoModeExternalAction/);
  assert.match(invoiceActions, /INVOICE_MARK_PAID/);
  assert.match(invoiceActions, /PAYMENT_RECORDED/);
  assert.match(invoiceActions, /Demo Mode is active\. Payment processing is restricted\./);
});
