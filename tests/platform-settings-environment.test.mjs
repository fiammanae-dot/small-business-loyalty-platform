import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform settings is an operational configuration center instead of static documentation", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Operational configuration center",
    "Control real platform readiness from one place.",
    "settingsTabs",
    "Security",
    "Communications",
    "Action Restrictions",
    "Audit Logs",
    "Integrations",
    "Maintenance",
    "role=\"tab\"",
    "normalizeTab",
    "prisma.business.count",
    "prisma.user.count",
    "prisma.businessSubscription.count",
    "prisma.activityAlert.count",
    "prisma.messageDeliveryQueue.count",
    "prisma.auditEvent.findMany",
    "getDatabaseName",
    "getEnvironmentName",
    "DATABASE_URL",
    "loyalty_platform_pilot",
    "Production",
    "Development",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }
});

test("security tab shows real status labels and operational links", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Security posture",
    "Session secret status",
    "Session duration",
    "CSRF protection status",
    "Login rate limiting status",
    "Password reset rate limiting status",
    "Public join rate limiting status",
    "Configured",
    "Missing",
    "Not configured",
    "View audit center",
    "Manage users",
    "/platform/audit-center",
    "/platform/users",
    "/platform/operations-center",
  ]) {
    assert.match(page, new RegExp(expected));
  }

  assert.match(page, /requireRole\("PLATFORM_OWNER"\)/);
});

test("communications tab shows provider readiness without fake controls", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Provider readiness",
    "Resend/email provider status",
    "Password reset sender status",
    "WhatsApp support number status",
    "Manual messages status",
    "Test email button",
    "Coming soon",
    "No existing safe System Admin test-email action exists, so no fake button is shown.",
    "Automated WhatsApp sending",
    "Manual WhatsApp share links exist",
    "RESEND_API_KEY",
    "PASSWORD_RESET_FROM_EMAIL",
  ]) {
    assert.match(page, new RegExp(expected));
  }

  assert.doesNotMatch(page, /sendTestEmailAction|testEmailAction|form action=\{.*email/i);
});

test("action restrictions tab uses the real backed toggle and does not show fake controls", () => {
  const page = read("src/app/platform/settings/page.tsx");
  const actions = read("src/app/platform/settings/actions.ts");

  for (const expected of [
    "Restriction Status",
    "What is blocked",
    "Email sending",
    "SMS",
    "WhatsApp",
    "Invoice/payment recording",
    "Campaign delivery",
    "Configured restriction catalog",
    "demoModeRestrictions.map",
    "toggleDemoModeAction",
    "CsrfInput scope=\"platform:settings\"",
    "Real customer communications remain paused while restrictions are active.",
  ]) {
    assert.match(page, new RegExp(expected));
  }

  assert.match(actions, /Action restrictions updated\./);
  assert.doesNotMatch(page, /Pilot\s+Protection|No real customer communications/);
});

test("audit logs tab exposes recent events, empty state, audit center, and export", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Recent platform and business audit events",
    "View audit center",
    "Export CSV",
    "/platform/audit-center",
    "/platform/audit-center/export?format=csv",
    "No audit events recorded yet.",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[?]/g, "\\?")));
  }
  assert.match(page, /formatDateTime\(event\.createdAt\)/);
});

test("integrations tab uses safe env presence checks and never exposes secret values", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Connected or missing integration state derived from safe environment-variable presence checks.",
    "Database connected",
    "Resend configured",
    "Storage configured",
    "Payment provider configured",
    "External WhatsApp API",
    "hasAnyEnv",
    "NEXT_PUBLIC_APP_URL",
    "APP_URL",
    "BLOB_READ_WRITE_TOKEN",
    "STRIPE_SECRET_KEY",
  ]) {
    assert.match(page, new RegExp(expected));
  }

  assert.doesNotMatch(page, /process\.env\.RESEND_API_KEY[^,\n]*\}/);
  assert.doesNotMatch(page, /process\.env\.STRIPE_SECRET_KEY[^,\n]*\}/);
});

test("maintenance tab links to operational pages", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Maintenance / Launch Readiness",
    "Database status",
    "Launch Readiness",
    "Health Analytics",
    "Billing Center",
    "Operations Center",
    "/platform/database",
    "/platform/launch-readiness",
    "/platform/health-analytics",
    "/platform/billing-center",
    "/platform/operations-center",
  ]) {
    assert.match(page, new RegExp(expected));
  }
});
