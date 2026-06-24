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
    "Test Camera",
    "Stop Camera",
    "Switch Camera",
    "BarcodeDetector",
    "jsQR",
    "Invalid loyalty QR code.",
    "This QR code is not a LoyaltyBase customer card.",
    "Camera access is required to scan customer cards.",
    "Camera active. Using browser-compatible QR scanning for this device.",
    "LoyaltyBase scanner camera error",
    "router.push(`/scan/${encodeURIComponent(result.token)}`)",
    "referral:${referralCode}",
  ]) {
    assert.match(scanner, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const expected of [
    "Search customer",
    "Search by name, phone, card link, QR link, scan token, or referral code.",
    "Name, phone, card link, scan token, or referral code",
    "Secure scanner link detected.",
    "Open scan flow",
    "extractScanToken(trimmedQuery)",
    "businessId",
    "firstName",
    "normalizedPhone",
    "referralCode",
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
    "Customer summary",
    "Card Number",
    "Last Visit",
    "Reason for multiple stamps",
    "Referral invitation found",
    "Enroll New Customer With Referral",
  ]) {
    assert.match(scan, new RegExp(expected));
  }
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
  assert.match(scan, /\) : \(\s*<form action=\{issueStampAction\}>/);
  assert.match(scan, /\{!redemption \? \(/);
  assert.match(scan, /\{!rewardReady && !redemption \? \(\s*<AdvancedStampOptions/);
});
test("scanner sound effects are configurable and outcome driven", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0028_scanner_sound_settings/migration.sql");
  const settings = read("src/app/dashboard/settings/page.tsx");
  const actions = read("src/app/dashboard/actions.ts");
  const scan = read("src/app/scan/[token]/page.tsx");
  const sound = read("src/components/ScannerSoundFeedback.tsx");

  assert.match(schema, /model BusinessScannerSettings/);
  assert.match(schema, /soundEffectsEnabled Boolean\s+@default\(true\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "business_scanner_settings"/);
  assert.match(settings, /Scanner Settings/);
  assert.match(settings, /Scanner Sound Effects/);
  assert.match(actions, /saveScannerSettingsAction/);
  assert.match(actions, /SCANNER_SETTINGS_UPDATED/);
  assert.match(scan, /ScannerSoundFeedback/);
  assert.ok(scan.includes('const soundEvent = qs.error'));
  assert.ok(scan.includes('? "error"'));
  assert.match(scan, /successProgress !== null && successProgress >= program.requiredStamps/);
  assert.match(scan, /event="error"/);
  assert.match(sound, /AudioContext/);
  assert.match(sound, /webkitAudioContext/);
  assert.match(sound, /LoyaltyBase scanner sound error/);
});
