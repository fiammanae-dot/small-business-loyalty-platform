import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("plan compliance uses existing branch-linked operational activity without schema changes", () => {
  const compliance = read("src/lib/plan-compliance.ts");

  for (const expected of [
    "businessCustomerMembership.findMany",
    "stampTransaction.findMany",
    "rewardRedemption.findMany",
    "scanEvent.findMany",
    "createdBranchId",
    "branchId",
    "role: { in: [\"STAFF\", \"BRANCH_MANAGER\"] }",
    "missingAssignmentCount",
  ]) {
    assert.match(compliance, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("starter multi-branch detection creates internal audit warning only", () => {
  const compliance = read("src/lib/plan-compliance.ts");
  const dashboard = read("src/app/dashboard/page.tsx");
  const auditCenter = read("src/app/platform/audit-center/page.tsx");

  assert.match(compliance, /planCode === "STARTER"/);
  assert.match(compliance, /POSSIBLE_MULTI_BRANCH_USAGE/);
  assert.match(compliance, /logAuditEvent/);
  assert.match(compliance, /recordAuditEvent/);
  assert.doesNotMatch(compliance, /suspend/i);
  assert.doesNotMatch(compliance, /block scanner/i);
  assert.match(dashboard, /planCompliance\.status === "POTENTIAL_MULTI_BRANCH"/);
  assert.match(dashboard, /Potential multi-branch activity/);
  assert.match(auditCenter, /label="compliance"/);
  assert.match(auditCenter, /Compliance Events/);
});
test("dashboard wires computed plan compliance into the account status card", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  assert.match(dashboard, /const planCompliance = await getPlanComplianceSummary/);
  assert.match(dashboard, /planCompliance=\{planCompliance\}/);
  assert.match(dashboard, /function AccountCard\(\{[\s\S]*planCompliance[\s\S]*PlanComplianceSummary/);
  assert.match(dashboard, /score \{planCompliance\.score\}\/100/);
});