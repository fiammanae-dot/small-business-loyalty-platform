import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("action restrictions remain internal while user-facing pilot wording is hidden", () => {
  const platformSettings = read("src/lib/platform-settings.ts");
  const settingsPage = read("src/app/platform/settings/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");

  assert.match(platformSettings, /where: \{ key: "demo_mode" \}/);
  assert.match(platformSettings, /demoModeRestrictions/);

  for (const expected of ["Action Restrictions", "Restriction Status", "Real customer communications remain paused while restrictions are active"]) {
    assert.match(settingsPage, new RegExp(expected));
  }

  assert.doesNotMatch(shell, /Pilot\s+Protection/);
  assert.doesNotMatch(settingsPage, /Pilot\s+Protection|No real customer communications/);
});

test("pilot protection changes and blocked external actions are audited server-side", () => {
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
  assert.match(messageActions, /This action is currently restricted\. Customer messaging is paused\./);
  assert.match(invoiceActions, /blockDemoModeExternalAction/);
  assert.match(invoiceActions, /INVOICE_MARK_PAID/);
  assert.match(invoiceActions, /PAYMENT_RECORDED/);
  assert.match(invoiceActions, /This action is currently restricted\. Payment processing is paused\./);
});
