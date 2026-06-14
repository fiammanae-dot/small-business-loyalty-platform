import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("System Administrator routes require platform role", () => {
  for (const path of [
    "src/app/platform/page.tsx",
    "src/app/platform/businesses/page.tsx",
    "src/app/platform/subscriptions/page.tsx",
    "src/app/platform/health-analytics/page.tsx",
    "src/app/platform/audit-center/page.tsx",
    "src/app/platform/billing-center/page.tsx",
    "src/app/platform/tenant-center/page.tsx",
    "src/app/platform/launch-readiness/page.tsx",
  ]) {
    assert.match(read(path), /requireRole\("PLATFORM_OWNER"\)/, path);
  }
});

test("Business Owner routes require business owner context", () => {
  for (const path of [
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/customers/page.tsx",
    "src/app/dashboard/programs/page.tsx",
    "src/app/dashboard/notifications/page.tsx",
    "src/app/dashboard/messages/page.tsx",
    "src/app/dashboard/messages/[id]/page.tsx",
  ]) {
    assert.match(read(path), /getBusinessOwnerContext|requireBusinessOwner/, path);
  }
});

test("Branch Manager routes require branch manager role", () => {
  for (const path of [
    "src/app/branch/page.tsx",
    "src/app/branch/customers/page.tsx",
    "src/app/branch/programs/page.tsx",
    "src/app/branch/scanner/page.tsx",
  ]) {
    assert.match(read(path), /requireRole\("BRANCH_MANAGER"\)/, path);
  }
});

test("Staff routes require staff role", () => {
  for (const path of [
    "src/app/staff/page.tsx",
    "src/app/staff/scanner/page.tsx",
    "src/app/staff/customers/new/page.tsx",
  ]) {
    assert.match(read(path), /requireRole\("STAFF"\)/, path);
  }
});

test("role redirects prevent cross-role route access through requireRole helper", () => {
  const session = read("src/lib/session.ts");
  assert.match(session, /if \(user\.role !== role\)/);
  assert.match(session, /redirect\(roleHomePath\[user\.role\]\)/);
});
