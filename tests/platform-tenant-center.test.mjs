import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("tenant center provides white-label, domain, tenant health, resource, audit, and export management views", () => {
  const page = read("src/app/platform/tenant-center/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");

  for (const expected of [
    "Tenant Center",
    "Total Tenants",
    "Active Tenants",
    "Trial Tenants",
    "Suspended Tenants",
    "Expired Tenants",
    "White Label Enabled",
    "Custom Domains Active",
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
    "White Label Management",
    "Business Logo",
    "Favicon",
    "Primary Color",
    "Secondary Color",
    "Brand Name",
    "Login Welcome Message",
    "Custom Footer Text",
    "Custom Login Experience",
    "Custom Login Logo",
    "Background Image",
    "Welcome Text",
    "Support Email",
    "Support Phone",
    "Customer Experience Branding",
    "Customer Portal",
    "QR Page",
    "Reward Page",
    "Enrollment Page",
    "Referral Page",
    "Custom Domain Management",
    "Default URL",
    "Custom Domain",
    "Domain Verification Status",
    "SSL Status",
    "Activation Status",
    "Tenant Resource Monitoring",
    "QR Scans",
    "Enrollments",
    "Storage Usage",
    "Database Usage",
    "Tenant Audit History",
    "Brand changes",
    "Plan changes",
    "Subscription changes",
    "Domain changes",
    "Owner changes",
    "Status changes",
    "Tenant Settings",
    "Allow referrals",
    "Allow rewards",
    "Allow QR scans",
    "Allow campaigns",
    "Allow messaging",
    "Allow custom domains",
    "Allow white label",
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
});

test("tenant center does not introduce loyalty, scan, reward, referral, or cooldown mutations", () => {
  const page = read("src/app/platform/tenant-center/page.tsx");

  assert.doesNotMatch(page, /prisma\.(stampTransaction|rewardRedemption|referral|cooldownEvent|scanEvent)\.(create|update|delete|upsert)/);
  assert.doesNotMatch(page, /earnedStamps\s*:/);
  assert.doesNotMatch(page, /bonusStamps\s*:/);
});
