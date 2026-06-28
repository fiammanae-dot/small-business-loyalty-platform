import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("branch dashboard exposes operational KPIs, quick actions, and activity sections", () => {
  const page = read("src/app/branch/page.tsx");

  for (const expected of [
    "New Customers Today",
    "Stamps Issued Today",
    "Rewards Redeemed Today",
    "Active Customers",
    "Customers close to reward",
    "Recent branch activity",
    "Operational periods",
    "This Week",
    "This Month",
    "Add Customer",
    "/branch/customers/new",
    "/branch/scanner",
    "/branch/programs",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(page, /createdBranchId: branchId/);
  assert.match(page, /where: \{ branchId/);
  assert.doesNotMatch(page, /\/dashboard\/billing/);
  assert.doesNotMatch(page, /\/dashboard\/settings/);
});

test("branch customer pages are branch scoped and show operational customer history", () => {
  const customers = read("src/app/branch/customers/page.tsx");
  const detail = read("src/app/branch/customers/[id]/page.tsx");
  const customerLib = read("src/lib/customers.ts");

  assert.match(customers, /createdBranchId: branchId/);
  assert.match(customers, /currentTier/);
  assert.match(customers, /rewardReady/);
  assert.match(customers, /lastVisit/);
  assert.match(customers, /redeemedRewards/);
  assert.match(customers, /Search and open customers assigned to this branch/);

  assert.match(customerLib, /\.\.\.\(branchId \? \{ createdBranchId: branchId \} : \{\}\)/);
  assert.match(detail, /branchId: user\.branchId/);
  assert.match(detail, /Current tier/);
  assert.match(detail, /Current progress/);
  assert.match(detail, /Last branch visit/);
  assert.match(detail, /Redeemed rewards/);
});

test("branch program views remain read-only and expose printable join QR materials", () => {
  const programs = read("src/app/branch/programs/page.tsx");
  const detail = read("src/app/branch/programs/[id]/page.tsx");
  const customers = read("src/app/branch/programs/[id]/customers/page.tsx");
  const action = read("src/app/branch/programs/actions.ts");
  const poster = read("src/app/branch/programs/[id]/join-poster/page.tsx");

  assert.match(programs, /where: \{ businessCustomerMembership: \{ createdBranchId: user\.branchId \} \}/);
  assert.match(detail, /where: \{ businessCustomerMembership: \{ createdBranchId: user\.branchId \} \}/);
  assert.match(customers, /where: \{ businessCustomerMembership: \{ createdBranchId: user\.branchId \} \}/);
  assert.match(customers, /createdBranchId: user\.branchId/);
  assert.match(action, /createdBranchId: user\.branchId/);

  assert.match(detail, /Program Join QR/);
  assert.match(detail, /getProgramJoinUrl\(program\.joinToken\)/);
  assert.match(detail, /CopyButton value=\{joinUrl\}/);
  assert.match(detail, /\/branch\/programs\/\$\{program\.uuid\}\/join-poster/);
  assert.match(poster, /requireRole\("BRANCH_MANAGER"\)/);
  assert.match(poster, /Scan to join our loyalty program/);

  assert.doesNotMatch(detail, /\/edit/);
  assert.doesNotMatch(detail, /toggleProgramAction/);
  assert.doesNotMatch(programs, /Create Program/);
});
