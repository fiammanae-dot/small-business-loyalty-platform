import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("support approval policy schema and migration add business policy and support requests", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0035_support_approval_policy/migration.sql");

  assert.match(schema, /enum SupportAccessPolicy/);
  assert.match(schema, /IMMEDIATE/);
  assert.match(schema, /APPROVAL_REQUIRED/);
  assert.match(schema, /EMERGENCY_ACCESS/);
  assert.match(schema, /enum SupportRequestStatus/);
  assert.match(schema, /model SupportRequest/);
  assert.match(schema, /supportAccessPolicy\s+SupportAccessPolicy\s+@default\(IMMEDIATE\)\s+@map\("support_access_policy"\)/);
  assert.match(migration, /CREATE TYPE "SupportAccessPolicy"/);
  assert.match(migration, /ALTER TABLE "businesses"\s+ADD COLUMN "support_access_policy"/);
  assert.match(migration, /CREATE TABLE "support_requests"/);
});

test("support actions route policy-gated access through requests and approval", () => {
  const actions = read("src/app/platform/businesses/support-actions.ts");
  const helper = read("src/lib/support-sessions.ts");

  assert.match(helper, /SUPPORT_REQUEST_EXPIRY_MINUTES = 30/);
  assert.match(helper, /expireStaleSupportRequests/);
  assert.match(actions, /business\.supportAccessPolicy === "IMMEDIATE"/);
  assert.match(actions, /business\.supportAccessPolicy === "EMERGENCY_ACCESS" && data\.emergency/);
  assert.match(actions, /prisma\.supportRequest\.create/);
  assert.match(actions, /approveSupportRequestAction/);
  assert.match(actions, /rejectSupportRequestAction/);
  assert.match(actions, /saveSupportAccessPolicyAction/);
});

test("operations center and business owner pages expose support approval workflow", () => {
  const operations = read("src/app/platform/operations-center/page.tsx");
  const startPage = read("src/app/platform/operations-center/support/start/page.tsx");
  const history = read("src/app/dashboard/support-history/page.tsx");
  const settings = read("src/app/dashboard/settings/page.tsx");

  assert.match(operations, /pendingRequests\.length/);
  assert.match(operations, /awaiting approval/);
  assert.match(operations, /Support ledger/);
  assert.match(startPage, /Emergency access/);
  assert.match(startPage, /Support Policy/);
  assert.match(startPage, /Submit Support Request/);
  assert.match(history, /Pending your approval/);
  assert.match(history, /approveSupportRequestAction/);
  assert.match(history, /rejectSupportRequestAction/);
  assert.match(settings, /Support Access Policy/);
  assert.match(settings, /Immediate Support/);
  assert.match(settings, /Approval Required/);
  assert.match(settings, /Emergency Access/);
});
