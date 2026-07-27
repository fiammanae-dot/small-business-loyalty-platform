import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("production session secret fails closed and dev auth is production-disabled", () => {
  const secrets = read("src/lib/secrets.ts");
  const devAuth = read("src/lib/dev-auth.ts");

  assert.match(secrets, /NODE_ENV !== "development"/);
  assert.match(secrets, /throw new Error\("SESSION_SECRET is required and was not set\."\)/);
  assert.match(devAuth, /NODE_ENV !== "production"/);
  assert.match(devAuth, /DEV_AUTH_FALLBACK === "true"/);
});

test("login uses CSRF, rate limiting, and failed login audit", () => {
  const login = read("src/app/login/actions.ts");
  const protection = read("src/lib/login-protection.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(login, /validateCsrfForm\(formData, "login"\)/);
  assert.match(login, /isLoginTemporarilyLocked/);
  assert.match(login, /recordFailedLogin/);
  assert.match(protection, /MAX_FAILED_ATTEMPTS = 5/);
  assert.match(protection, /WINDOW_MINUTES = 15/);
  assert.match(schema, /model FailedLoginAudit/);
});

test("stamp issuance and reward redemption are CSRF and idempotency protected", () => {
  const scanActions = read("src/app/scan/actions.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(scanActions, /validateCsrfForm\(formData, "scan:stamp"\)/);
  assert.match(scanActions, /validateCsrfForm\(formData, "scan:redemption"\)/);
  assert.match(scanActions, /idempotencyKey/);
  assert.match(schema, /model StampTransaction[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(schema, /model RewardRedemption[\s\S]*idempotencyKey\s+String\?\s+@unique/);
});

test("redemption uses transaction row locking before resetting stamps", () => {
  const scanActions = read("src/app/scan/actions.ts");

  assert.match(scanActions, /FOR UPDATE/);
  assert.match(scanActions, /earnedStamps:\s*0/);
  assert.match(scanActions, /bonusStamps:\s*getStartingBonusStampsForEvent\(\{[\s\S]*event:\s*"CARD_RESET"/);
});

test("suspended subscriptions and inactive branches are enforced on critical workflows", () => {
  // The scanner actions delegate subscription/branch gating to the shared
  // guard, so their audited source includes src/lib/authz.ts.
  const scanActions = read("src/app/scan/actions.ts") + read("src/lib/authz.ts");
  const scanPage = read("src/app/scan/[token]/page.tsx");
  const dashboardActions = read("src/app/dashboard/actions.ts");
  const programActions = read("src/app/dashboard/programs/actions.ts");
  const staffCustomerActions = read("src/app/staff/customers/actions.ts");
  const branchCustomerActions = read("src/app/branch/customers/actions.ts");

  for (const source of [scanActions, scanPage, dashboardActions, programActions, staffCustomerActions, branchCustomerActions]) {
    assert.match(source, /requireUsableSubscription|hasUsableSubscription/);
  }

  for (const source of [scanActions, scanPage, staffCustomerActions, branchCustomerActions]) {
    assert.match(source, /requireActiveBranch|BRANCH_INACTIVE_MESSAGE/);
  }

  assert.match(read("src/app/scan/actions.ts"), /requireBusinessScopedUser\(\{\s*requireSubscription: true,\s*requireActiveBranch: true,/);
});
