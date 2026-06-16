import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("tenant center provides tenant health, branding, resource, audit, and export management views", () => {
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
    "Tenant Branding",
    "Business Logo",
    "Primary Color",
    "Secondary Color",
    "Button Color",
    "Customer Card Branding",
    "Customer Experience Branding",
    "Customer Card",
    "QR Page",
    "Reward Page",
    "Enrollment Page",
    "Referral Page",
    "Tenant Resource Monitoring",
    "QR Scans",
    "Enrollments",
    "Storage Usage",
    "Database Usage",
    "Tenant Audit History",
    "Brand changes",
    "Plan changes",
    "Subscription changes",
    "Owner changes",
    "Status changes",
    "Billing changes",
    "Tenant Settings",
    "Allow referrals",
    "Allow rewards",
    "Allow QR scans",
    "Allow messaging",
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
});

test("tenant center does not introduce loyalty, scan, reward, referral, or cooldown mutations", () => {
  const page = read("src/app/platform/tenant-center/page.tsx");

  assert.doesNotMatch(page, /prisma\.(stampTransaction|rewardRedemption|referral|cooldownEvent|scanEvent)\.(create|update|delete|upsert)/);
  assert.doesNotMatch(page, /earnedStamps\s*:/);
  assert.doesNotMatch(page, /bonusStamps\s*:/);
});
