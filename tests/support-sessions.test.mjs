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

test("platform owner can create support sessions with required reason and duration", function () {
  const actions = read("src/app/platform/businesses/support-actions.ts");
  assert.match(actions, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(actions, /Reason for access is required/);
  assert.match(actions, /SUPPORT_SESSION_DURATIONS\.includes/);
  assert.match(actions, /expiresAt: new Date\(now\.getTime\(\) \+ data\.durationMinutes \* 60 \* 1000\)/);
  assert.match(actions, /status: "ACTIVE"/);
  assert.match(actions, /redirect\(`\/dashboard\?supportSessionId=\$\{session\.id\}`\)/);
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
  assert.match(helper, /expiresAt: \{ lte: now \}/);
  assert.match(helper, /status: "EXPIRED"/);
  assert.match(helper, /session\.expiresAt > now/);
  assert.match(actions, /endedAt: new Date\(\)/);
  assert.match(actions, /status: "ENDED"/);
});

test("support session UI is exposed from business detail and uses a dedicated start page", function () {
  const detail = read("src/app/platform/businesses/[id]/page.tsx");
  const page = read("src/app/platform/businesses/[id]/support-session/page.tsx");
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.match(detail, /Support Access/);
  assert.match(detail, /Open Support Session/);
  assert.match(page, /Reason for access/);
  assert.match(page, /Start Support Session/);
  assert.match(page, /Read-only mode/);
  assert.match(dashboard, /SupportSessionNotice/);
  assert.match(dashboard, /End support session/);
});