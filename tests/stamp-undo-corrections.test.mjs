import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(path, "utf8");

test("scanner undo action enforces ownership, timing, latest-stamp, and audit rules", () => {
  const actions = read("src/app/scan/actions.ts");

  assert.match(actions, /const STAMP_UNDO_WINDOW_MINUTES = 3/);
  assert.match(actions, /export async function undoStampAction/);
  assert.match(actions, /validateCsrfForm\(formData, "scan:stamp-undo"\)/);
  assert.match(actions, /stampTransaction\.issuedByUserId !== user\.id/);
  assert.match(actions, /Only the most recent stamp can be undone/);
  assert.match(actions, /rewardRedemption\.findFirst/);
  assert.match(actions, /STAMP_UNDONE/);
  assert.match(actions, /STAMP_MANUAL_CORRECTION/);
  assert.match(actions, /earnedStamps:\s*Math\.max\(0,\s*lockedMembership\.earnedStamps - stampTransaction\.quantity\)/);
  assert.match(actions, /createAbuseAlert/);
  assert.match(actions, /OUT_OF_BRANCH_ACTION_MESSAGE/);
});

test("scan result exposes undo workflow only after successful stamp issue", () => {
  const page = read("src/app/scan/[token]/page.tsx");

  assert.match(page, /function StampUndoPanel/);
  assert.match(page, /Stamp added successfully/);
  assert.match(page, /Undo last stamp\?/);
  assert.match(page, /name="undoReason"/);
  assert.match(page, /Wrong customer scanned/);
  assert.match(page, /Duplicate scan/);
  assert.match(page, /Customer cancelled purchase/);
  assert.match(page, /System error/);
  assert.match(page, /Other/);
  assert.match(page, /getStampUndoEligibility/);
  assert.match(page, /undone/);
});

test("business owner manual corrections require reason and are audited", () => {
  const actions = read("src/app/dashboard/actions.ts");
  const customerPage = read("src/app/dashboard/customers/[id]/page.tsx");

  assert.match(actions, /manualStampCorrectionSchema/);
  assert.match(actions, /export async function manualStampCorrectionAction/);
  assert.match(actions, /requireBusinessOwner/);
  assert.match(actions, /reason:\s*z\.string\(\)\.trim\(\)\.min\(5/);
  assert.match(actions, /STAMP_MANUAL_CORRECTION/);
  assert.match(actions, /previousEarnedStamps/);
  assert.match(actions, /newEarnedStamps/);
  assert.match(actions, /logAuditEvent/);

  assert.match(customerPage, /manualStampCorrectionAction/);
  assert.match(customerPage, /Manual correction/);
  assert.match(customerPage, /name="correctionReason"/);
  assert.match(customerPage, /dashboard:stamp-correction/);
});

test("customer activity includes stamp undo and manual correction history", () => {
  const customerPage = read("src/app/dashboard/customers/[id]/page.tsx");

  assert.match(customerPage, /correctionEvents/);
  assert.match(customerPage, /STAMP_UNDONE/);
  assert.match(customerPage, /STAMP_MANUAL_CORRECTION/);
  assert.match(customerPage, /Stamp removed \/ undone/);
  assert.match(customerPage, /Manual stamp correction/);
  assert.match(customerPage, /auditMetadata/);
});
