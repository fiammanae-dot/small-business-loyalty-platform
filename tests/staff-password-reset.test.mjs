import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("staff password reset is business-scoped and limited to branch managers and staff", () => {
  const actions = read("src/app/dashboard/actions.ts");
  const staffPage = read("src/app/dashboard/staff/page.tsx");
  const resetComponent = read("src/components/StaffPasswordResetAction.tsx");

  assert.match(actions, /export async function resetStaffPasswordAction/);
  assert.match(actions, /await requireBusinessOwner\(\)/);
  assert.match(actions, /businessId: owner\.businessId/);
  assert.match(actions, /role: \{ in: \["BRANCH_MANAGER", "STAFF"\] \}/);
  assert.doesNotMatch(actions, /role: \{ in: \["PLATFORM_OWNER"/);
  assert.doesNotMatch(actions, /role: \{ in: \["BUSINESS_OWNER"/);

  assert.match(staffPage, /StaffPasswordResetAction/);
  assert.match(resetComponent, /Generate secure temporary password/);
  assert.match(resetComponent, /Email delivery is not configured yet/);
  assert.match(resetComponent, /temporary password is shown once/i);
});

test("staff password reset hashes passwords, forces next-login change, logs audit, and invalidates sessions", () => {
  const actions = read("src/app/dashboard/actions.ts");
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0022_staff_password_reset_security/migration.sql");
  const session = read("src/lib/session.ts");
  const login = read("src/app/login/actions.ts");
  const changePassword = read("src/app/change-password/actions.ts");

  assert.match(schema, /forcePasswordChange Boolean\s+@default\(false\)\s+@map\("force_password_change"\)/);
  assert.match(schema, /passwordChangedAt DateTime\s+@default\(now\(\)\)\s+@map\("password_changed_at"\)/);
  assert.match(schema, /lastLoginAt\s+DateTime\?\s+@map\("last_login_at"\)/);
  assert.match(migration, /ADD COLUMN "force_password_change" BOOLEAN NOT NULL DEFAULT false/);

  assert.match(actions, /const passwordHash = await bcrypt\.hash\(temporaryPassword, 12\)/);
  assert.match(actions, /forcePasswordChange: true/);
  assert.match(actions, /sessionVersion: \{ increment: 1 \}/);
  assert.match(actions, /action: "STAFF_PASSWORD_RESET"/);
  assert.match(actions, /temporaryPasswordDisplayedOnce: true/);

  assert.match(login, /lastLoginAt: new Date\(\)/);
  assert.match(login, /user\.forcePasswordChange \? "\/change-password" : roleHomePath\[user\.role\]/);
  assert.match(session, /if \(user\.forcePasswordChange\) \{\s*redirect\("\/change-password"\)/);
  assert.match(changePassword, /forcePasswordChange: false/);
  assert.match(changePassword, /action: "PASSWORD_CHANGED"/);
});
