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
  assert.match(actions, /redirect\("\/dashboard"\)/);
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
  assert.match(actions, /endedAt: new Date\(\)/);
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
