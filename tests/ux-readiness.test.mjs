import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("business dashboard includes beta readiness polish without changing loyalty workflows", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  for (const expected of [
    "DashboardPageLayout",
    "DashboardCommandCenter",
    "Today\'s Operations",
    "Quick Actions",
    "Action Required",
    "Business Health",
    "Recent Activity",
    "Subscription Summary",
    "Open Scanner",
    "Pending Referrals",
  ]) {
    assert.match(dashboard, new RegExp(expected));
  }

  assert.doesNotMatch(dashboard, /Add Staff/);
  assert.doesNotMatch(dashboard, /HeaderSummary/);
  assert.doesNotMatch(dashboard, /MainActions/);
  assert.doesNotMatch(dashboard, /RecentCustomers/);
  assert.doesNotMatch(dashboard, /ProgramPerformance/);
  assert.doesNotMatch(dashboard, /SummaryTile/);
  assert.doesNotMatch(dashboard, /CSV report preparation/);
  assert.doesNotMatch(dashboard, /TopReferrers/);
  assert.doesNotMatch(dashboard, /Cooldown Monitoring/);
});

test("customer profile uses compact Customer 360 command center", () => {
  const profile = read("src/app/dashboard/customers/[id]/page.tsx");

  for (const expected of [
    "Customer 360",
    "CommandInfo",
    "PageActions",
    "ActionMenu",
    "ProfileSummaryCard",
    "LoyaltyOverviewPanel",
    "LatestActivityPreview",
    "TierDetailsPanel",
    "RewardsPanel",
    "ReferralSummaryPanel",
    "CustomerCardPanel",
    "Loyalty Progress",
    "Recent Activity",
    "Rewards",
    "Referrals",
    "Card & QR",
    "Tier Summary",
    "Quick Actions",
    "Open Card",
    "Copy Card Link",
    "Share Card",
    "Enroll Program",
    "Issue Stamp",
    "Redeem Reward",
    "Active program",
    "Reward status",
    "Open Referral Center",
    "xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]",
  ]) {
    assert.equal(profile.includes(expected), true, `${expected} should appear in rebuilt Customer 360`);
  }

  for (const removed of [
    "CustomerSummaryCard",
    "DetailPageLayout",
    "MetricCard",
    "ReferralStatusBadge",
    "TabLink",
    "Customer profile tabs",
    "?tab=",
    "Communication history",
    "Manual delivery history",
    "[\"messages\", \"Messages\"]",
    "[\"redemptions\", \"Redemptions\"]",
    "Customer profile:",
    "JSON.stringify",
  ]) {
    assert.equal(profile.includes(removed), false, `${removed} should not appear in rebuilt Customer 360`);
  }
});
test("customer and program lists include mobile card views and helpful empty states", () => {
  const customers = read("src/app/dashboard/customers/page.tsx");
  const programs = read("src/app/dashboard/programs/page.tsx");

  assert.match(customers, /Search by name, phone number, referral code or card number/);
  assert.match(customers, /No customers found/);
  assert.match(customers, /lg:hidden/);
  assert.match(customers, /PageHeader/);
  assert.match(customers, /MetricCard/);
  assert.match(customers, /SavedViews/);
  assert.match(customers, /ActionMenu/);
  assert.match(customers, /ProgressBar/);
  assert.match(customers, /Reward Ready/);
  assert.doesNotMatch(customers, /View<\/Link>\s*<Link[\s\S]*Edit<\/Link>/);
  assert.match(programs, /Create your first loyalty program/);
  assert.match(programs, /Program Performance/);
  assert.match(programs, /ActionMenu/);
  assert.match(programs, /ProgressBar/);
  assert.match(programs, /lg:hidden/);
});

test("csv exports and launch readiness are business or platform scoped", () => {
  const exportsRoute = read("src/app/dashboard/exports/[type]/route.ts");
  const launchReadiness = read("src/app/platform/launch-readiness/page.tsx");

  assert.match(exportsRoute, /requireRole\("BUSINESS_OWNER"\)/);
  assert.match(exportsRoute, /businessId/);
  assert.match(exportsRoute, /Content-Type": "text\/csv/);
  assert.match(launchReadiness, /requireRole\("PLATFORM_OWNER"\)/);
});

test("demo mode is platform controlled and visible in the shared shell", () => {
  assert.match(read("src/app/platform/settings/actions.ts"), /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(read("src/components/DashboardShell.tsx"), /Demo/);
  assert.match(read("prisma/migrations/0016_phase_7f_operational_readiness/migration.sql"), /platform_settings/);
});

test("phase 7f.1 fixes add scanner banners, mobile cards, and wizard labels", () => {
  const scan = read("src/app/scan/[token]/page.tsx");
  const businessForm = read("src/components/BusinessForm.tsx");

  assert.match(scan, /Valid Customer/);
  assert.match(scan, /Reward Ready/);
  assert.match(scan, /Suspicious Activity Alert/);
  assert.match(scan, /Disabled Card/);
  assert.match(businessForm, /Review & Create/);
  assert.match(businessForm, /Owner Account/);
  assert.match(read("src/app/dashboard/messages/page.tsx"), /Messages are prepared only and are not sent automatically/);
  assert.match(read("src/app/dashboard/notifications/page.tsx"), /Investigate Alert/);
  assert.match(read("src/app/branch/page.tsx"), /Branch Performance/);
  assert.match(read("src/app/staff/page.tsx"), /Today.*Activity/);
});
