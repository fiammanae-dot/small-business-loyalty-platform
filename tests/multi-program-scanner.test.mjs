import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("scanner parser accepts customer card URLs as scan inputs", () => {
  const scanLib = read("src/lib/scan.ts");

  assert.match(scanLib, /parts\.indexOf\("card"\)/);
  assert.match(scanLib, /\(\?:scan\|card\)/);
});

test("card-level scan resolves business customer membership and handles program counts", () => {
  const scanPage = read("src/app/scan/[token]/page.tsx");

  assert.match(scanPage, /businessCustomerMembership\.findUnique\(\{\s*where:\s*\{ cardToken: token \}/s);
  assert.match(scanPage, /programMemberships:\s*\{\s*where:\s*\{\s*status:\s*"ACTIVE",\s*scanStatus:\s*"ACTIVE",\s*loyaltyProgram:\s*\{ active: true \}/s);
  assert.match(scanPage, /if \(activePrograms\.length === 1\) \{\s*redirect\(`\/scan\/\$\{activePrograms\[0\]\.scanToken\}`\);\s*\}/s);
  assert.match(scanPage, /if \(activePrograms\.length > 1\)/);
  assert.match(scanPage, /<ProgramSelectionScreen/);
  assert.match(scanPage, /No Active Program/);
});

test("multi-program selection requires staff to choose one program and preserves existing scan-token flow", () => {
  const scanPage = read("src/app/scan/[token]/page.tsx");
  const scanActions = read("src/app/scan/actions.ts");

  assert.match(scanPage, /Program selection required/);
  assert.match(scanPage, /Only the selected program will be updated/);
  assert.match(scanPage, /href=\{`\/scan\/\$\{programMembership\.scanToken\}`\}/);
  assert.match(scanPage, /Reward Ready/);
  assert.match(scanActions, /customerProgramMembership\.findUnique\(\{\s*where:\s*\{ scanToken: data\.scanToken \}/s);
  assert.match(scanActions, /earnedStamps:\s*\{ increment: data\.quantity \}/);
  assert.match(scanActions, /customerProgramMembershipId:\s*programMembership\.id/);
  assert.match(scanActions, /loyaltyProgramId:\s*updatedMembership\.loyaltyProgramId/);
});

test("tier and referral behavior remain business-level while rewards stay program-specific", () => {
  const scanActions = read("src/app/scan/actions.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(scanActions, /customerProgramMembership:\s*\{ businessCustomerMembershipId: programMembership\.businessCustomerMembershipId \}/);
  assert.match(scanActions, /qualifyReferralFromFirstStamp\(\{[\s\S]*referredMembershipId:\s*programMembership\.businessCustomerMembershipId[\s\S]*loyaltyProgramId:\s*updatedMembership\.loyaltyProgramId/);
  assert.match(schema, /model BusinessCustomerMembership[\s\S]*referralCode\s+String\?[\s\S]*currentTier\s+CustomerTierName/s);
  assert.match(schema, /model CustomerProgramMembership[\s\S]*@@unique\(\[businessCustomerMembershipId, loyaltyProgramId\]\)/s);
});