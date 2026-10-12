import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("plan compliance uses existing branch-linked operational activity without schema changes", () => {
  const compliance = read("src/lib/plan-compliance.ts");

  for (const expected of [
    // Grouped per branch by the database instead of loading every row.
    "businessCustomerMembership.groupBy",
    "stampTransaction.groupBy",
    "rewardRedemption.groupBy",
    "scanEvent.groupBy",
    "createdBranchId",
    "branchId",
    "role: { in: [...STAFF_LIMIT_ROLES] }",
    "missingAssignmentCount",
  ]) {
    assert.match(compliance, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("multi-branch detection follows each plan's limits and creates an internal audit warning only", () => {
  const compliance = read("src/lib/plan-compliance.ts");
  const dashboard = read("src/app/dashboard/page.tsx");
  const auditCenter = read("src/app/platform/audit-center/page.tsx");

  // Every plan is checked against its own limits, not only Starter.
  assert.doesNotMatch(compliance, /planCode === "STARTER"/);
  assert.match(compliance, /maxBranches: plan\?\.maxBranches \?\? DEFAULT_PLAN_LIMITS\.maxBranches/);
  assert.match(compliance, /POSSIBLE_MULTI_BRANCH_USAGE/);
  assert.match(compliance, /logAuditEvent/);
  assert.match(compliance, /recordAuditEvent/);
  assert.doesNotMatch(compliance, /suspend/i);
  assert.doesNotMatch(compliance, /block scanner/i);
  assert.match(dashboard, /const complianceWarning = planCompliance\.status !== "COMPLIANT";/);
  assert.match(dashboard, /\{complianceStatusLabel\(planCompliance\.status\)\}/);
  assert.match(auditCenter, /label="compliance"/);
  assert.match(auditCenter, /Compliance Events/);
});
test("dashboard wires computed plan compliance into the account status card", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  // Started alongside the other dashboard queries, then awaited.
  assert.match(dashboard, /const planCompliancePromise = getPlanComplianceSummary\(/);
  assert.match(dashboard, /const planCompliance = await planCompliancePromise;/);
  assert.match(dashboard, /planCompliance=\{planCompliance\}/);
  assert.match(dashboard, /function AccountCard\(\{[\s\S]*planCompliance[\s\S]*PlanComplianceSummary/);
  assert.match(dashboard, /score \{planCompliance\.score\}\/100/);
});