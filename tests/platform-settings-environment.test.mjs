import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform settings exposes environment information and health summary", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "settingsTabs",
    "General",
    "Security",
    "Notifications",
    "Demo Mode",
    "Audit Logs",
    "role=\"tab\"",
    "Environment Information",
    "Current Database",
    "Application Version",
    "Build Status",
    "Last Deployment",
    "Platform Health Summary",
    "Active Subscriptions",
    "System Status",
    "getDatabaseName",
    "getEnvironmentName",
    "DATABASE_URL",
    "packageJson.version",
    "Healthy",
    "Not Available",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }

  assert.match(page, /loyalty_platform_pilot/);
  assert.match(page, /Pilot/);
  assert.match(page, /Development/);
  assert.match(page, /Production/);
  assert.match(page, /prisma\.business\.count/);
  assert.match(page, /prisma\.globalCustomer\.count/);
  assert.match(page, /prisma\.activityAlert\.count/);
  assert.match(page, /prisma\.auditEvent\.findMany/);
});

test("platform settings demo mode panel is explicit about current and future protections", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Demo Mode Status",
    "Current Restrictions",
    "Manual message sending blocked",
    "Invoice payment recording blocked",
    "Future Integrations Protected",
    "Email sending",
    "SMS sending",
    "WhatsApp sending",
    "Campaign delivery",
    "External integrations",
    "No real customer communications will be sent while Demo Mode protections are active.",
  ]) {
    assert.match(page, new RegExp(expected));
  }
});

test("platform settings has administration tabs for future integrations and audit visibility", () => {
  const page = read("src/app/platform/settings/page.tsx");

  for (const expected of [
    "Security Administration",
    "Future Security Integrations",
    "Single sign-on",
    "IP allow lists",
    "Future Delivery Providers",
    "WhatsApp Business API",
    "SMS gateway",
    "Transactional email",
    "Future Routing Rules",
    "Provider health monitoring",
    "Recent platform and business audit events",
    "No audit events recorded yet.",
  ]) {
    assert.match(page, new RegExp(expected));
  }
});
