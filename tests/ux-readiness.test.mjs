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
    "function AccountCard",
    "Recent Activity",
    "Open Scanner",
    "\\{pendingReferrals\\} pending \\{pendingReferrals === 1",
    "totalOpenAlerts",
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
    "function Info",
    "PageActions",
    "ActionMenu",
    "ProfileSummaryCard",
    "LoyaltyOverviewPanel",
    "LatestActivityPreview",
    "TierDetailsPanel",
    "RewardsPanel",
    "ReferralSummaryPanel",
    "CustomerCardPanel",
    "Loyalty progress",
    "Recent activity",
    "Rewards",
    "Referrals",
    "Card & QR",
    "Tier status",
    "Open Card",
    "Copy Card Link",
    "Share Card",
    "Enroll Program",
    "Issue Stamp",
    "Redeem Reward",
    "Active program",
    "Reward ready",
    "Open Referral Center",
    "xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]",
  ]) {
    assert.equal(profile.includes(expected), true, `${expected} should appear in rebuilt Customer 360`);
  }

  assert.match(profile, /const primaryScanHref = primaryProgram \? `\/scan\/\$\{primaryProgram\.scanToken\}` : "\/dashboard\/scanner"/);
  assert.match(profile, /href=\{primaryScanHref\}[\s\S]*Issue Stamp/);
  assert.match(profile, /href=\{`\/scan\/\$\{programMembership\.scanToken\}`\}[\s\S]*Redeem Reward/);

  for (const removed of [
    "CustomerSummaryCard",
    "DetailPageLayout",
    "ReferralStatusBadge",
    "TabLink",
    "Customer profile tabs",
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
  assert.match(customers, /PageIntro/);
  assert.match(customers, /aria-label="Customer segments"/);
  assert.match(customers, /Reward ready/);
  assert.doesNotMatch(customers, /ActionMenu/);
  assert.match(customers, /ChevronRight/);
  assert.match(customers, /Open \$\{row\.customerName\} Customer 360/);
  assert.match(customers, /ProgressBar/);
  assert.match(customers, /Reward Ready/);
  assert.doesNotMatch(customers, /View<\/Link>\s*<Link[\s\S]*Edit<\/Link>/);
  assert.match(programs, /Create your first loyalty program/);
  assert.match(programs, /Program Performance/);
  assert.match(programs, /href=\{"\/dashboard\/programs\/" \+ row\.program\.uuid\}/);
  assert.match(programs, /hover:underline/);
  assert.doesNotMatch(programs, /ProgramActions/);
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
  assert.match(read("src/app/dashboard/notifications/page.tsx"), />Investigate</);
  assert.match(read("src/app/branch/page.tsx"), /Branch Performance/);
  assert.match(read("src/app/staff/page.tsx"), /Today.*Activity/);
});

test("new business creation defaults branding to black and white without changing edit fallback", () => {
  const businessForm = read("src/components/BusinessForm.tsx");
  const businessActions = read("src/app/platform/businesses/actions.ts");

  assert.match(businessForm, /createBrandingDefaults[\s\S]*primaryColor: "#000000"/);
  assert.match(businessForm, /createBrandingDefaults[\s\S]*secondaryColor: "#FFFFFF"/);
  assert.match(businessForm, /createBrandingDefaults[\s\S]*buttonColor: "#000000"/);
  assert.match(businessForm, /editBrandingDefaults[\s\S]*primaryColor: "#F97316"/);
  assert.match(businessForm, /editBrandingDefaults[\s\S]*secondaryColor: "#FDBA74"/);
  assert.match(businessForm, /editBrandingDefaults[\s\S]*buttonColor: "#F97316"/);
  assert.match(businessActions, /primaryColor: colorSchema\.default\("#000000"\)/);
  assert.match(businessActions, /secondaryColor: colorSchema\.default\("#FFFFFF"\)/);
  assert.match(businessActions, /buttonColor: colorSchema\.default\("#000000"\)/);
  assert.match(businessActions, /primaryColor: getString\(formData, "primaryColor"\) \|\| "#000000"/);
  assert.match(businessActions, /secondaryColor: getString\(formData, "secondaryColor"\) \|\| "#FFFFFF"/);
  assert.match(businessActions, /buttonColor: getString\(formData, "buttonColor"\) \|\| "#000000"/);
});
