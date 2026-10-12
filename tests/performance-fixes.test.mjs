/**
 * Speed fixes: pages load only what they show, totals are added up by the
 * database, repeated lookups happen once per request, and every workspace
 * shows a loading screen the moment a link is clicked.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the customer list loads one page of customers and counts in the database", () => {
  const page = read("src/app/dashboard/customers/page.tsx");
  assert.match(page, /const CUSTOMERS_PER_PAGE = 50;/);
  assert.match(page, /skip: \(currentPage - 1\) \* CUSTOMERS_PER_PAGE,\s*take: CUSTOMERS_PER_PAGE,/);
  assert.match(page, /prisma\.businessCustomerMembership\.count\(\{ where \}\)/);
  assert.match(page, /function CustomerPager/);
  // The old "load every customer a second time to count segments" query is gone.
  assert.doesNotMatch(page, /allCustomers/);
  // Reward state comes from a light query of stamp counts only.
  assert.match(page, /async function loadRewardStates\(businessId: number\)/);
  assert.match(page, /select: \{ businessCustomerMembershipId: true, loyaltyProgramId: true, earnedStamps: true, bonusStamps: true, claimedRewardStamps: true \}/);
});

test("program totals are added up by the database, not by loading every stamp", () => {
  const stats = read("src/lib/program-stats.ts");
  assert.match(stats, /SUM\(st\."quantity"\)/);
  assert.match(stats, /prisma\.rewardRedemption\.groupBy\(/);
  for (const file of ["src/app/dashboard/programs/page.tsx", "src/app/dashboard/page.tsx"]) {
    const source = read(file);
    assert.match(source, /getProgramActivityTotals\(user\.businessId\)/, file);
    assert.doesNotMatch(source, /stampTransactions: \{ select: \{ quantity: true \} \}/, file);
  }
  const detail = read("src/app/dashboard/programs/[id]/page.tsx");
  assert.match(detail, /_count: \{ select: \{ rewardRedemptions: true \} \}/);
  assert.match(detail, /const recentMembers = await prisma\.customerProgramMembership\.findMany\(/);
});

test("the signed-in user, business and branding are looked up once per request", () => {
  const session = read("src/lib/session.ts");
  assert.match(session, /const loadSessionUser = cache\(\(userId: number, role: UserRole\) =>/);
  assert.match(session, /const user = await loadSessionUser\(session\.userId, session\.role\);/);
  assert.match(session, /const loadTwoFactorRequirement = cache\(/);
  assert.match(read("src/lib/business-owner.ts"), /const loadOwnerBusiness = cache\(/);
  assert.match(read("src/lib/business-branding.ts"), /const loadBusinessBranding = cache\(/);
  // The shell no longer runs a query and throws the answer away.
  assert.doesNotMatch(read("src/components/DashboardShell.tsx"), /isDemoModeEnabled/);
});

test("every workspace shows a loading screen straight away", () => {
  for (const file of ["src/app/dashboard/loading.tsx", "src/app/branch/loading.tsx", "src/app/staff/loading.tsx", "src/app/scan/[token]/loading.tsx"]) {
    assert.ok(existsSync(file), file);
    assert.match(read(file), /<WorkspaceLoading/, file);
  }
  assert.match(read("src/components/WorkspaceLoading.tsx"), /role="status"/);
});
