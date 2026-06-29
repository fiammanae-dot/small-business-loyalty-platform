import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }

test("support session schema and migration create time-limited platform support records", function () {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0031_support_sessions_foundation/migration.sql");
  assert.match(schema, /enum SupportSessionStatus/);
  assert.match(schema, /model SupportSession/);
  assert.match(schema, /businessId\s+Int\s+@map\("business_id"\)/);
  assert.match(schema, /adminUserId\s+Int\s+@map\("admin_user_id"\)/);
  assert.match(schema, /readOnly\s+Boolean\s+@default\(true\)\s+@map\("read_only"\)/);
  assert.match(schema, /status\s+SupportSessionStatus\s+@default\(ACTIVE\)/);
  assert.match(migration, /CREATE TABLE "support_sessions"/);
  assert.match(migration, /"expires_at" TIMESTAMP\(3\) NOT NULL/);
  assert.match(migration, /"status" "SupportSessionStatus" NOT NULL DEFAULT 'ACTIVE'/);
});

test("support session activity schema and migration track auditable support work", function () {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0032_support_session_activity_tracking/migration.sql");
  assert.match(schema, /enum SupportSessionActivityType/);
  assert.match(schema, /SESSION_STARTED/);
  assert.match(schema, /CUSTOMER_VIEWED/);
  assert.match(schema, /RECORD_CHANGED/);
  assert.match(schema, /model SupportSessionActivity/);
  assert.match(schema, /supportSessionId Int\s+@map\("support_session_id"\)/);
  assert.match(schema, /activityType\s+SupportSessionActivityType\s+@map\("activity_type"\)/);
  assert.match(migration, /CREATE TABLE "support_session_activities"/);
  assert.match(migration, /"activity_type" "SupportSessionActivityType" NOT NULL/);
  assert.match(migration, /support_session_activities_support_session_id_created_at_idx/);
});

test("platform owner can create support sessions with required reason and duration", function () {
  const actions = read("src/app/platform/businesses/support-actions.ts");
  assert.match(actions, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(actions, /Reason for access is required/);
  assert.match(actions, /SUPPORT_SESSION_DURATIONS\.includes/);
  assert.match(actions, /expiresAt: new Date\(now\.getTime\(\) \+ data\.durationMinutes \* 60 \* 1000\)/);
  assert.match(actions, /status: "ACTIVE"/);
  assert.match(actions, /await setSupportSessionCookie\(session\.id\)/);
  assert.match(actions, /activityType: "SESSION_STARTED"/);
  assert.match(actions, /dashboard\?supportSessionId=\$\{session\.id\}/);
  assert.match(actions, /supportSession\.findFirst/);
  assert.match(actions, /activeSessionId=\$\{activeSession\.id\}/);
  assert.match(actions, /joinSupportSessionAction/);
  assert.match(actions, /activityType: "SESSION_JOINED"/);
});

test("business users cannot create support sessions through platform guard", function () {
  const actions = read("src/app/platform/businesses/support-actions.ts");
  const helper = read("src/lib/support-sessions.ts");
  assert.match(actions, /await requireRole\("PLATFORM_OWNER"\)/);
  assert.match(helper, /currentUser\.role !== "PLATFORM_OWNER"/);
  assert.match(helper, /redirect\(roleHomePath\[currentUser\.role\]\)/);
});

test("expired sessions are not treated as active and can be ended", function () {
  const helper = read("src/lib/support-sessions.ts");
  const actions = read("src/app/platform/businesses/support-actions.ts");
  const expiredRoute = read("src/app/support-session/expired/route.ts");
  assert.match(helper, /expiresAt: \{ lte: now \}/);
  assert.match(helper, /status: "EXPIRED"/);
  assert.match(helper, /session\.expiresAt > now/);
  assert.match(actions, /const endedAt = new Date\(\)/);
  assert.match(actions, /status: "ENDED"/);
  assert.match(actions, /activityType: "SESSION_ENDED"/);
  assert.match(actions, /await clearSupportSessionCookie\(\)/);
  assert.match(expiredRoute, /activityType: "SESSION_EXPIRED"/);
});

test("support mode tracks major page views without noisy duplicate events", function () {
  const helper = read("src/lib/support-activity.ts");
  const route = read("src/app/support-session/activity/route.ts");
  const tracker = read("src/components/SupportActivityTracker.tsx");
  const shell = read("src/components/DashboardShell.tsx");
  assert.match(helper, /classifySupportPath/);
  assert.match(helper, /CUSTOMER_VIEWED/);
  assert.match(helper, /PROGRAM_VIEWED/);
  assert.match(helper, /STAFF_VIEWED/);
  assert.match(helper, /SETTINGS_VIEWED/);
  assert.match(helper, /throttleMinutes > 0/);
  assert.match(route, /getActiveSupportSessionForCurrentAdmin/);
  assert.match(route, /throttleMinutes: 5/);
  assert.match(tracker, /\/support-session\/activity/);
  assert.match(shell, /SupportActivityTracker/);
});

test("support session UI exposes real audit timeline and platform summary", function () {
  const detail = read("src/app/platform/businesses/[id]/page.tsx");
  const page = read("src/app/platform/businesses/[id]/support-session/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");
  const banner = read("src/components/SupportModeBanner.tsx");
  const endButton = read("src/components/SupportEndSessionButton.tsx");
  assert.match(detail, /Support Access/);
  assert.match(detail, /Open Support Session/);
  assert.match(detail, /_count: \{ select: \{ activities: true \} \}/);
  assert.match(detail, /Activities/);
  assert.match(page, /Reason for access/);
  assert.match(page, /Start Support Session/);
  assert.match(page, /Read-only mode/);
  assert.match(page, /Support Session Already Active/);
  assert.match(page, /Join Existing Session/);
  assert.match(shell, /SupportModeBanner/);
  assert.match(banner, /SUPPORT MODE/);
  assert.match(banner, /View Session Details/);
  assert.match(banner, /Audit Timeline/);
  assert.doesNotMatch(banner, /Coming Soon/);
  assert.match(banner, /activities\.map/);
  assert.match(banner, /endSessionControl/);
  assert.match(endButton, /End Support Session/);
  assert.match(banner, /🔴 SUPPORT/);
});


test("operations center support module exposes session management and reports", function () {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0033_support_session_operations_center/migration.sql");
  const shell = read("src/components/DashboardShell.tsx");
  const operations = read("src/app/platform/operations-center/page.tsx");
  const report = read("src/app/platform/operations-center/support/[id]/page.tsx");
  const actions = read("src/app/platform/businesses/support-actions.ts");
  const terminateButton = read("src/components/TerminateSupportSessionButton.tsx");

  assert.match(schema, /supportSummary\s+String\?\s+@map\("support_summary"\)/);
  assert.match(migration, /ADD COLUMN "support_summary" TEXT/);
  assert.match(shell, /Operations Center/);
  assert.match(shell, /\/platform\/operations-center/);
  assert.match(operations, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(operations, /Support \(active\)|label="Support"/);
  assert.match(operations, /Compliance/);
  assert.match(operations, /Platform Health/);
  assert.match(operations, /Background Jobs/);
  assert.match(operations, /Active Support Sessions/);
  assert.match(operations, /Recent Support Sessions/);
  assert.match(operations, /Active Sessions/);
  assert.match(operations, /Completed Today/);
  assert.match(operations, /Average Duration/);
  assert.match(operations, /Longest Session/);
  assert.match(operations, /Common Reason/);
  assert.match(operations, /Total Sessions/);
  assert.match(operations, /data-operations-center-lite/);
  assert.match(operations, /Active Support Sessions/);
  assert.match(operations, /Sessions Today/);
  assert.match(operations, /Active Alerts/);
  assert.match(operations, /Operations Center Lite quick actions/);
  assert.match(operations, /Start Support Session/);
  assert.match(operations, /Active Sessions/);
  assert.match(operations, /Refresh/);
  assert.match(operations, /Available on desktop/);
  assert.match(operations, /MobileSupportSessionCard/);
  assert.match(operations, /TerminateSupportSessionButton/);
  assert.match(operations, /joinSupportSessionAction/);
  assert.match(operations, /View Report/);
  assert.match(actions, /Support summary is required/);
  assert.match(actions, /supportSummary: parsed\.data\.supportSummary/);
  assert.match(actions, /revalidatePath\("\/platform\/operations-center"\)/);
  assert.match(terminateButton, /Business:/);
  assert.match(terminateButton, /Administrator:/);
  assert.match(terminateButton, /Support Summary is required/);
  assert.match(report, /Support Session Report/);
  assert.match(report, /data-support-session-mobile-view/);
  assert.match(report, /Countdown/);
  assert.match(report, /End Session/);
  assert.match(report, /Available on desktop/);
  assert.match(report, /Support Notes/);
  assert.match(report, /Timeline/);
  assert.match(report, /Export unavailable/);
  assert.match(report, /activities/);
});

test("operations center can start support sessions directly", function () {
  const operations = read("src/app/platform/operations-center/page.tsx");
  const startPage = read("src/app/platform/operations-center/support/start/page.tsx");
  const actions = read("src/app/platform/businesses/support-actions.ts");

  assert.match(operations, /Start Support Session/);
  assert.match(operations, /\/platform\/operations-center\/support\/start/);
  assert.match(startPage, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(startPage, /Select Business/);
  assert.match(startPage, /Reason for access/);
  assert.match(startPage, /durationMinutes/);
  assert.match(startPage, /15/);
  assert.match(startPage, /30/);
  assert.match(startPage, /60/);
  assert.match(startPage, /Read-only mode/);
  assert.match(startPage, /startSupportSessionAction/);
  assert.match(startPage, /Support Session Already Active/);
  assert.match(startPage, /Join Existing Session/);
  assert.match(startPage, /SupportCountdown/);
  assert.match(startPage, /formPath/);
  assert.match(startPage, /activeRedirectTo/);
  assert.match(actions, /activeRedirectTo/);
  assert.match(actions, /businessId=\$\{business\.id\}&activeSessionId=\$\{activeSession\.id\}/);
  assert.match(actions, /dashboard\?supportSessionId=\$\{session\.id\}/);
  assert.match(actions, /revalidatePath\("\/platform\/operations-center"\)/);
});

test("business owners can view support history without internal audit details", function () {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0034_business_support_notifications/migration.sql");
  const page = read("src/app/dashboard/support-history/page.tsx");
  const dashboard = read("src/app/dashboard/page.tsx");
  const navigation = read("src/components/RoleNavigation.tsx");
  const actions = read("src/app/platform/businesses/support-actions.ts");

  assert.match(schema, /model BusinessNotification/);
  assert.match(schema, /businessNotifications BusinessNotification\[\]/);
  assert.match(migration, /CREATE TABLE "business_notifications"/);
  assert.match(page, /requireBusinessOwner/);
  assert.match(page, /supportSession\.findMany/);
  assert.match(page, /Date/);
  assert.match(page, /Support Summary/);
  assert.match(page, /Started at/);
  assert.match(page, /Ended at/);
  assert.doesNotMatch(page, /activities/);
  assert.doesNotMatch(page, /adminUser/);
  assert.doesNotMatch(page, /Session ID/);
  assert.match(dashboard, /Support Access/);
  assert.match(dashboard, /No support access recorded/);
  assert.match(dashboard, /LoyaltyBase Support is currently assisting with your workspace/);
  assert.match(navigation, /\/dashboard\/support-history/);
  assert.match(actions, /businessNotification\.create/);
  assert.match(actions, /Support Access Completed/);
  assert.match(actions, /LoyaltyBase Support accessed your workspace/);
});
