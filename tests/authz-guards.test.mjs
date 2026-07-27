import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

// CI runs `node --test` on Node 20, which cannot import .ts sources directly.
// Following the repo convention of testing the real source file, we read
// src/lib/authz-policy.ts, transpile it with the repo's existing TypeScript
// devDependency, and import the result as an in-memory ES module — so these
// behavioral tests still exercise the actual policy implementation, not a
// copy. This only works because the policy module is pure by design: its
// single import is type-only and erased at transpile time.
const policySource = read("src/lib/authz-policy.ts");
assert.doesNotMatch(
  policySource,
  /^import (?!type )/m,
  "src/lib/authz-policy.ts must stay free of runtime imports (type-only imports allowed) so its behavioral tests can run on CI's Node 20",
);
const transpiledPolicy = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { BUSINESS_SCOPED_ROLES, evaluateBusinessScopedAccess, isOutOfAssignedBranch, isSameBusiness } = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledPolicy).toString("base64")}`
);

function makeUser(overrides = {}) {
  return {
    role: "BUSINESS_OWNER",
    businessId: 6,
    businessStatus: "ACTIVE",
    branchId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Behavioral tests for the pure policy core (imported directly, no mocks).
// ---------------------------------------------------------------------------

test("business-scoped access allows each operational role with an active business", () => {
  for (const role of BUSINESS_SCOPED_ROLES) {
    const result = evaluateBusinessScopedAccess(makeUser({ role, branchId: role === "BUSINESS_OWNER" ? null : 3 }));
    assert.deepEqual(result, { ok: true, businessId: 6 }, role);
  }
});

test("unauthenticated users are denied before any other check", () => {
  assert.deepEqual(evaluateBusinessScopedAccess(null), { ok: false, reason: "UNAUTHENTICATED" });
});

test("platform admins are denied by the business-scoped guard (role not allowed)", () => {
  const result = evaluateBusinessScopedAccess(makeUser({ role: "PLATFORM_OWNER" }));
  assert.deepEqual(result, { ok: false, reason: "ROLE_NOT_ALLOWED" });
});

test("a narrowed role list denies business-scoped roles outside the list", () => {
  const staff = makeUser({ role: "STAFF", branchId: 3 });
  assert.deepEqual(evaluateBusinessScopedAccess(staff, { roles: ["BUSINESS_OWNER", "BRANCH_MANAGER"] }), {
    ok: false,
    reason: "ROLE_NOT_ALLOWED",
  });
  assert.deepEqual(evaluateBusinessScopedAccess(makeUser(), { roles: ["BUSINESS_OWNER"] }), { ok: true, businessId: 6 });
});

test("a missing business assignment is denied before the inactive-business check", () => {
  const result = evaluateBusinessScopedAccess(makeUser({ businessId: null, businessStatus: null }));
  assert.deepEqual(result, { ok: false, reason: "MISSING_BUSINESS" });
});

test("an inactive business is denied for every operational role", () => {
  for (const role of BUSINESS_SCOPED_ROLES) {
    const result = evaluateBusinessScopedAccess(makeUser({ role, businessStatus: "INACTIVE" }));
    assert.deepEqual(result, { ok: false, reason: "INACTIVE_BUSINESS" }, role);
  }
});

test("business mismatch detection is exact", () => {
  assert.equal(isSameBusiness(6, 6), true);
  assert.equal(isSameBusiness(6, 7), false);
});

test("branch scoping restricts STAFF and BRANCH_MANAGER but never BUSINESS_OWNER", () => {
  const membershipInBranch = { createdBranchId: 3 };
  const membershipElsewhere = { createdBranchId: 9 };

  for (const role of ["STAFF", "BRANCH_MANAGER"]) {
    assert.equal(isOutOfAssignedBranch({ role, branchId: 3 }, membershipInBranch), false, role);
    assert.equal(isOutOfAssignedBranch({ role, branchId: 3 }, membershipElsewhere), true, role);
    assert.equal(isOutOfAssignedBranch({ role, branchId: null }, membershipInBranch), true, `${role} without branch`);
  }

  assert.equal(isOutOfAssignedBranch({ role: "BUSINESS_OWNER", branchId: null }, membershipElsewhere), false);
});

// ---------------------------------------------------------------------------
// Enforcement: every server action file authorizes through a shared guard,
// with subscription/branch/inactive-business failure messages preserved.
// ---------------------------------------------------------------------------

test("authz server guards preserve the exact existing redirect targets and message sources", () => {
  const authz = read("src/lib/authz.ts");

  assert.match(authz, /redirect\("\/login"\)/);
  assert.match(authz, /redirect\(roleHomePath\[user\.role\]\)/);
  assert.match(authz, /redirect\("\/business-inactive"\)/);
  assert.match(authz, /redirect\("\/change-password"\)/);
  assert.match(authz, /options\.fail\(INACTIVE_BUSINESS_ACCESS_MESSAGE\)/);
  assert.match(authz, /requireUsableSubscription\(access\.businessId\)\.catch\(\(error: Error\) => options\.fail\(error\.message\)\)/);
  assert.match(authz, /requireActiveBranch\(scopedUser\.branchId, access\.businessId\)\.catch\(\(error: Error\) => options\.fail\(error\.message\)\)/);
  assert.match(authz, /export async function requirePlatformAdmin/);
  assert.match(authz, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(authz, /export function assertSameBusiness/);
  assert.match(authz, /export function assertSameBranch/);
});

test("every business-scoped and platform server action file authorizes through a shared guard", () => {
  const guardPatterns = {
    "src/app/scan/actions.ts": /requireBusinessScopedUser\(\{/,
    "src/app/dashboard/actions.ts": /await requireBusinessOwner\(\)/,
    "src/app/dashboard/programs/actions.ts": /await requireBusinessOwner\(\)/,
    "src/app/dashboard/messages/actions.ts": /requireBusinessScopedUserOrRedirect\(\{/,
    "src/app/dashboard/notifications/actions.ts": /requireBusinessScopedUser\(\{/,
    "src/app/staff/customers/actions.ts": /requireRole\("STAFF"\)/,
    "src/app/staff/scanner/actions.ts": /requireRole\("STAFF"\)/,
    "src/app/branch/customers/actions.ts": /requireRole\("BRANCH_MANAGER"\)/,
    "src/app/branch/programs/actions.ts": /requireRole\("BRANCH_MANAGER"\)/,
    "src/app/branch/scanner/actions.ts": /requireRole\("BRANCH_MANAGER"\)/,
    "src/app/platform/businesses/actions.ts": /requirePlatformAdmin\(\)/,
    "src/app/platform/businesses/support-actions.ts": /requirePlatformAdmin\(\)/,
    "src/app/platform/users/actions.ts": /requirePlatformAdmin\(\)/,
    "src/app/platform/invoices/actions.ts": /requirePlatformAdmin\(\)/,
    "src/app/platform/subscriptions/actions.ts": /requirePlatformAdmin\(\)/,
    "src/app/platform/settings/actions.ts": /requirePlatformAdmin\(\)/,
  };

  for (const [file, pattern] of Object.entries(guardPatterns)) {
    assert.match(read(file), pattern, file);
  }

  // No migrated action file hand-rolls the session lookup anymore. The
  // remaining getCurrentUser() call sites are intentionally special:
  // card-share-actions returns booleans instead of redirecting, and the
  // login/change-password flows are self-service by design.
  for (const file of [
    "src/app/scan/actions.ts",
    "src/app/dashboard/messages/actions.ts",
    "src/app/dashboard/notifications/actions.ts",
  ]) {
    assert.doesNotMatch(read(file), /getCurrentUser\(/, file);
  }
});

test("scanner actions keep tenant ownership and branch scope checks on every code path", () => {
  const scanActions = read("src/app/scan/actions.ts");

  assert.match(scanActions, /import \{ isOutOfAssignedBranch, requireBusinessScopedUser \} from "@\/lib\/authz"/);
  assert.match(scanActions, /businessMembership\.businessId !== user\.businessId/);
  assert.match(scanActions, /lockedMembership\.businessCustomerMembership\.businessId !== user\.businessId/);
  assert.match(scanActions, /isOutOfAssignedBranch\(user, businessMembership\)/);
  assert.match(scanActions, /isOutOfAssignedBranch\(user, lockedMembership\.businessCustomerMembership\)/);

  const occurrences = scanActions.match(/requireBusinessScopedUser\(\{/g) ?? [];
  assert.equal(occurrences.length, 3, "issue, redeem, and undo must each call the shared guard exactly once");
});

test("alert review is role-limited, tenant-scoped, and now blocks inactive businesses", () => {
  const actions = read("src/app/dashboard/notifications/actions.ts");

  assert.match(actions, /roles: \["BUSINESS_OWNER", "BRANCH_MANAGER"\]/);
  assert.match(actions, /fail: \(message\) => fail\(message\)/);
  assert.match(actions, /businessId:\s*user\.businessId/);
});
