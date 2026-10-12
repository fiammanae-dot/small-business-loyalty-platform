/**
 * One paid branch must not quietly run more shops:
 * - plans limit active staff logins, enforced on create and on re-enable;
 * - branch and staff limits are checked under a per-business lock (no
 *   double-submit race);
 * - every sign-in and scan records its device, network and city;
 * - the System Administrator sees a plan check for every business.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");
const base = {
  maxBranches: 1,
  maxStaff: 3,
  branchCount: 1,
  activeStaffCount: 2,
  activityBranchCount: 1,
  assignedBranchCount: 1,
  missingAssignmentCount: 0,
  scannerDeviceCount: 3,
  scanCities: ["Dubai"],
  cityJumps: 0,
};

test("a business within its plan passes the plan check", async () => {
  const { evaluatePlanCompliance } = await loadTs("src/lib/plan-compliance-rules.ts");
  assert.deepEqual(evaluatePlanCompliance(base), { status: "COMPLIANT", score: 100, issues: [] });
});

test("more branches or staff logins than the plan allows is over the limit", async () => {
  const { evaluatePlanCompliance } = await loadTs("src/lib/plan-compliance-rules.ts");
  const result = evaluatePlanCompliance({ ...base, branchCount: 2, activeStaffCount: 5 });
  assert.equal(result.status, "OVER_LIMIT");
  assert.deepEqual(result.issues.slice(0, 2), ["2 branches set up; the plan allows 1.", "5 active staff logins; the plan allows 3."]);
});

test("signs of one branch running two shops ask for a review", async () => {
  const { evaluatePlanCompliance, scannerDeviceAllowance } = await loadTs("src/lib/plan-compliance-rules.ts");
  assert.equal(scannerDeviceAllowance(3, 1), 4);
  const devices = evaluatePlanCompliance({ ...base, scannerDeviceCount: 5 });
  assert.equal(devices.status, "REVIEW");
  assert.match(devices.issues[0], /^5 different scanner devices in the last 30 days \(about 4 expected\)\.$/);

  const jumps = evaluatePlanCompliance({ ...base, cityJumps: 3 });
  assert.equal(jumps.status, "REVIEW");
  assert.match(jumps.issues[0], /one branch scanned from two cities within 30 minutes/);
  // Two jumps can be a phone switching networks - not enough on their own.
  assert.equal(evaluatePlanCompliance({ ...base, cityJumps: 2 }).status, "COMPLIANT");

  // One branch with scans in two cities is normal (mobile data); three is not.
  assert.equal(evaluatePlanCompliance({ ...base, scanCities: ["Dubai", "Sharjah"] }).status, "COMPLIANT");
  assert.equal(evaluatePlanCompliance({ ...base, scanCities: ["Abu Dhabi", "Dubai", "Sharjah"] }).status, "REVIEW");

  assert.equal(evaluatePlanCompliance({ ...base, activityBranchCount: 2 }).status, "REVIEW");
});

test("the limit message names staff logins and spells branches correctly", async () => {
  const { limitReachedMessage } = await loadTs("src/lib/subscriptions.ts");
  assert.equal(limitReachedMessage("staff", 3), "Your current plan allows up to 3 active staff logins. Upgrade your plan to add more.");
  assert.equal(limitReachedMessage("branch", 3), "Your current plan allows up to 3 branches. Upgrade your plan to add more.");
  assert.equal(limitReachedMessage("branch", 1), "Your current plan allows up to 1 branch. Upgrade your plan to add more.");
});

test("plans carry a staff limit: Starter 3, Growth 10, Multi Branch 30", () => {
  assert.match(read("prisma/schema.prisma"), /maxStaff\s+Int\s+@default\(3\) @map\("max_staff"\)/);
  const migration = read("prisma/migrations/0069_plan_staff_limit_access_trail/migration.sql");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "max_staff" INTEGER NOT NULL DEFAULT 3;/);
  assert.match(migration, /SET "max_staff" = 3 WHERE "code" = 'STARTER'/);
  assert.match(migration, /SET "max_staff" = 10 WHERE "code" = 'GROWTH'/);
  assert.match(migration, /SET "max_staff" = 30 WHERE "code" = 'MULTI_BRANCH'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "login_events"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "device_id" TEXT/);
});

test("branch and staff limits are enforced under a per-business lock", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(read("src/lib/plan-limits.ts"), /SELECT pg_advisory_xact_lock\(/);
  // Branches: count + create inside one locked transaction.
  assert.match(actions, /await lockBusinessLimit\(tx, user\.businessId, "branch"\);\s*const branchCount = await tx\.branch\.count/);
  assert.match(actions, /if \(!createdBranch\) fail\("\/dashboard\/branches", limitReachedMessage\("branch", maxBranches\)\);/);
  // Staff: subscription required, then count + create inside one locked transaction.
  const create = actions.slice(actions.indexOf("export async function createStaffUserAction"), actions.indexOf("export async function toggleStaffStatusAction"));
  assert.match(create, /await requireUsableSubscription\(user\.businessId\)/);
  assert.match(create, /await lockBusinessLimit\(tx, user\.businessId, "staff"\);\s*if \(\(await countActiveStaff\(user\.businessId, tx\)\) >= maxStaff\) return null;/);
  assert.match(create, /limitReachedMessage\("staff", maxStaff\)/);
  // Re-enabling a disabled login uses a slot too.
  const toggle = actions.slice(actions.indexOf("export async function toggleStaffStatusAction"));
  assert.match(toggle, /if \(nextStatus === "ACTIVE"\) \{/);
  assert.match(toggle, /current\?\.status !== "ACTIVE" && \(await countActiveStaff\(user\.businessId, tx\)\) >= maxStaff/);
});

test("every browser gets a device id and every sign-in and scan records where it came from", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /const DEVICE_COOKIE = "lc_device";/);
  assert.match(proxy, /request\.cookies\.set\(DEVICE_COOKIE, deviceId\);/);
  assert.match(proxy, /response\.cookies\.set\(DEVICE_COOKIE, deviceId, \{\s*httpOnly: true,/);
  const trail = read("src/lib/access-trail.ts");
  assert.match(trail, /export const DEVICE_COOKIE = "lc_device";/);
  assert.match(trail, /x-vercel-ip-city/);
  assert.match(trail, /prisma\.loginEvent\.create\(/);
  assert.match(read("src/lib/session.ts"), /await recordLoginEvent\(user\.id\);/);
  const scan = read("src/app/scan/[token]/page.tsx");
  assert.match(scan, /\.\.\.\(await scanAccessFields\(\)\),/);
  assert.match(scan, /\.\.\.scanAccess,/);
});

test("the System Administrator sees the plan check on the business list and detail page", () => {
  const list = read("src/app/platform/businesses/page.tsx");
  assert.match(list, /const compliance = await getPlanCompliance\(allBusinesses\.map\(\(business\) => business\.id\)\);/);
  assert.match(list, /label="Plan check issues"/);
  assert.match(list, /<DataTableHeadCell>Plan check<\/DataTableHeadCell>/);
  const detail = read("src/app/platform/businesses/[id]/page.tsx");
  assert.match(detail, /<PlanCheckPanel/);
  assert.match(detail, /prisma\.loginEvent\.findMany\(/);
  assert.match(detail, /by: \["deviceId", "ipCity", "branchId"\]/);
});
