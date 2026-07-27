import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("staff and branch scanner pages use the shared camera scanner", () => {
  assert.match(read("src/app/staff/scanner/page.tsx"), /CameraScanner/);
  assert.match(read("src/app/branch/scanner/page.tsx"), /CameraScanner/);
  assert.match(read("src/app/dashboard/scanner/page.tsx"), /CameraScanner/);
  assert.match(read("src/app/dashboard/page.tsx"), /href="\/dashboard\/scanner"/);
});

test("camera scanner keeps camera controls while universal lookup handles text entry", () => {
  const scanner = read("src/components/CameraScanner.tsx");
  const lookup = read("src/components/ScannerManualCustomerSearch.tsx");

  for (const expected of [
    "Start Camera",
    "Stop Camera",
    "Switch Camera",
    "BarcodeDetector",
    "jsQR",
    "Invalid loyalty QR code.",
    "This QR code is not a Loyalty Card UAE customer card.",
    "Camera access is required to scan customer cards.",
    "Camera active. Using browser-compatible QR scanning for this device.",
    "Loyalty Card UAE scanner camera error",
    "router.push(scanFlowHref(result.token))",
    "/scan/referral/",
    "referral:${referralCode}",
  ]) {
    assert.match(scanner, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const expected of [
    "Search customer",
    "Search by name, phone, card link, QR link, scan token, or referral code.",
    "Name, phone, card link, scan token, or referral code",
    "detectedTypeLabel",
    "Security note: this opens the existing server-side validation flow",
    "Open scan flow",
    "extractScanToken(trimmedQuery)",
    "businessId",
    "firstName",
    "normalizedPhone",
    "referralCode",
    "scanFlowHref(secureScanToken)",
    "/scan/referral/",
  ]) {
    assert.match(lookup, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(scanner, /Paste QR \/ Card Link/);
  assert.doesNotMatch(scanner, /manualValue/);
  assert.doesNotMatch(scanner, /function ScannerStatus/);
  assert.doesNotMatch(scanner, /<ScannerStatus/);
});
test("scan result page keeps validation flow and improves scan experience", () => {
  const scan = read("src/app/scan/[token]/page.tsx");

  for (const expected of [
    "Valid Customer",
    "Reward Ready",
    "Suspicious Activity Alert",
    "Access Denied",
    "This customer belongs to a different business workspace.",
    "For privacy and security reasons, customer information cannot be viewed or modified outside the assigned business.",
    "If you believe this is a mistake, contact your Business Owner or System Administrator.",
    "Back to Scanner",
    "scannerPathForRole",
    "Disabled Card",
    "ScannerResultCard",
    "DetailPageLayout",
    "ProgressBar",
    "Phone",
    "Workspace",
    "Card Number",
    "Last Visit",
    "Reason for multiple stamps",
    "Referral invitation found",
    "Enroll New Customer With Referral",
  ]) {
    assert.match(scan, new RegExp(expected));
  }
});

test("referral scanner flow uses referral route and graceful validation state", () => {
  const lookup = read("src/components/ScannerManualCustomerSearch.tsx");
  const camera = read("src/components/CameraScanner.tsx");
  const scanPage = read("src/app/scan/[token]/page.tsx");
  const referralRoute = read("src/app/scan/referral/[code]/page.tsx");

  assert.match(lookup, /scanFlowHref\(secureScanToken\)/);
  assert.match(camera, /router\.push\(scanFlowHref\(result\.token\)\)/);
  assert.match(referralRoute, /encodeURIComponent/);
  assert.match(referralRoute, /referral:/);
  assert.match(scanPage, /decodeScanRouteToken/);
  assert.match(scanPage, /referralCodeFromScanRouteToken/);
  assert.match(scanPage, /Referral not available./);
});

test("manual scan token parser accepts scan URLs and direct tokens for existing validation route", () => {
  const scanLib = read("src/lib/scan.ts");

  assert.match(scanLib, /\[A-Za-z0-9_-\]\{3,160\}/);
  assert.match(scanLib, /\/scan\//);
});



test("scanner reward-ready state hides stamp actions and shows dynamic reset message", () => {
  const scan = read("src/app/scan/[token]/page.tsx");

  assert.match(scan, /description=\{`Progress has been reset to 0 \/ \$\{program\.requiredStamps\}\.\`\}/);
  assert.match(scan, /\{rewardReady \? \(/);
  assert.match(scan, /canRedeem \? \(/);
  assert.match(scan, /\["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"\]\.includes\(authUser\.role\)/);
  assert.match(scan, /Issue Stamp &amp; Share via WhatsApp/);
  assert.match(scan, /shareAfterStamp/);
  assert.match(scan, /\{!redemption \? \(/);
  assert.match(scan, /\{!rewardReady && !redemption \? \(\s*<AdvancedStampOptions/);
  assert.doesNotMatch(scan, /Only Branch Managers and Business Owners can redeem rewards/);
});
test("staff cannot issue stamps when a scanned program is reward ready", () => {
  const actions = read("src/app/scan/actions.ts");

  assert.match(actions, /STAFF_REWARD_READY_STAMP_BLOCK_MESSAGE/);
  assert.match(actions, /user\.role === "STAFF"/);
  assert.match(actions, /isRewardReady\(\{/);
  assert.match(actions, /fail\(data\.scanToken, STAFF_REWARD_READY_STAMP_BLOCK_MESSAGE\)/);
});

test("staff can redeem ready rewards through the protected scanner action", () => {
  const actions = read("src/app/scan/actions.ts");
  const redemptionAction = actions.slice(actions.indexOf("export async function redeemRewardAction"));

  assert.match(redemptionAction, /requireBusinessScopedUser\(\{/);
  assert.match(redemptionAction, /businessMembership\.businessId !== user\.businessId/);
  assert.match(redemptionAction, /Reward is not ready yet\./);
  assert.match(redemptionAction, /redeemedByUserId:\s*user\.id/);
});

test("scanner sound effects are configurable and outcome driven", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0028_scanner_sound_settings/migration.sql");
  const settings = read("src/app/dashboard/settings/page.tsx");
  const actions = read("src/app/dashboard/actions.ts");
  const scan = read("src/app/scan/[token]/page.tsx");
  const sound = read("src/components/ScannerSoundFeedback.tsx");
  const soundHelper = read("src/lib/scanner-sounds.ts");

  assert.match(schema, /model BusinessScannerSettings/);
  assert.match(schema, /soundEffectsEnabled Boolean\s+@default\(true\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "business_scanner_settings"/);
  assert.match(settings, /Scanner Settings/);
  assert.match(settings, /Scanner Sound Effects/);
  assert.match(actions, /saveScannerSettingsAction/);
  assert.match(actions, /SCANNER_SETTINGS_UPDATED/);
  assert.match(scan, /ScannerSoundFeedback/);
  assert.ok(scan.includes('const soundEvent = qs.error'));
  assert.match(scan, /\?\s+"invalid"/);
  assert.match(scan, /"stamp-added"/);
  assert.match(scan, /: "valid"/);
  assert.match(scan, /event="invalid"/);
  assert.match(scan, /event="valid"/);
  assert.match(sound, /playScannerSound/);
  assert.match(sound, /unlockScannerAudio/);
  assert.match(soundHelper, /scannerValidSound/);
  assert.match(soundHelper, /scannerInvalidSound/);
  assert.match(soundHelper, /stampAddedSound/);
  assert.match(soundHelper, /AudioContext/);
  assert.match(soundHelper, /webkitAudioContext/);
  assert.match(soundHelper, /stopScannerSound/);
  assert.match(soundHelper, /Loyalty Card UAE scanner sound error/);
});


