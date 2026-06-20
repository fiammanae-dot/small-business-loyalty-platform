import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("tenant center provides operational tenant overview, directory, health, resource, and export views", () => {
  const page = read("src/app/platform/tenant-center/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");

  for (const expected of [
    "Tenant Center",
    "Total Tenants",
    "Active Tenants",
    "Trial Tenants",
    "Suspended Tenants",
    "Expired Tenants",
    "Total Customers Across Platform",
    "Tenant Directory",
    "Business Name",
    "Owner",
    "Plan",
    "Status",
    "Branches",
    "Programs",
    "Customers",
    "Created Date",
    "View",
    "Edit",
    "Suspend",
    "Activate",
    "Archive",
    "Transfer Ownership",
    "Tenant Health Score",
    "Tenant Resource Monitoring",
    "QR Scans",
    "Enrollments",
    "Storage Usage",
    "Database Usage",
    "CSV",
    "Excel",
    "PDF",
    "requireRole(\"PLATFORM_OWNER\")",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[()"]/g, "\\$&")));
  }

  assert.match(shell, /\/platform\/tenant-center/);
  assert.match(shell, /Tenant Center/);
  assert.match(shell, /Layers3/);
  assert.doesNotMatch(page, /White Label|white-label|Custom Domain|custom domains|Future-ready/);
  assert.doesNotMatch(page, /Tenant Branding|Customer Experience Branding|Tenant Settings|Tenant Audit History/);
});

test("tenant center does not introduce loyalty, scan, reward, referral, or cooldown mutations", () => {
  const page = read("src/app/platform/tenant-center/page.tsx");

  assert.doesNotMatch(page, /prisma\.(stampTransaction|rewardRedemption|referral|cooldownEvent|scanEvent)\.(create|update|delete|upsert)/);
  assert.doesNotMatch(page, /earnedStamps\s*:/);
  assert.doesNotMatch(page, /bonusStamps\s*:/);
});
