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
  assert.match(dashboard, /Plan Compliance Status/);
  assert.match(dashboard, /Potential Multi-Branch Activity Detected/);
  assert.match(auditCenter, /Plan Compliance Warnings/);
  assert.match(auditCenter, /Compliance Events/);
});
test("dashboard wires computed plan compliance into HeaderSummary", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  assert.match(dashboard, /const planCompliance = await getPlanComplianceSummary/);
  assert.match(dashboard, /planCompliance=\{planCompliance\}/);
  assert.match(dashboard, /function HeaderSummary\(\{[\s\S]*planCompliance,[\s\S]*\}: \{[\s\S]*planCompliance: PlanComplianceSummary;/);
  assert.match(dashboard, /<PlanComplianceCard compliance=\{planCompliance\} \/>/);
});