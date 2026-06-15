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

test("camera scanner supports camera controls, manual paste, and safe invalid QR messages", () => {
  const scanner = read("src/components/CameraScanner.tsx");

  for (const expected of [
    "Start Camera",
    "Test Camera",
    "Stop Camera",
    "Switch Camera",
    "Paste QR / Card Link",
    "BarcodeDetector",
    "jsQR",
    "Invalid loyalty QR code.",
    "This QR code is not a LoyaltyBase customer card.",
    "Camera access is required to scan customer cards.",
    "Camera active. Using browser-compatible QR scanning for this device.",
    "LoyaltyBase scanner camera error",
    "router.push(`/scan/${encodeURIComponent(result.token)}`)",
  ]) {
    assert.match(scanner, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(scanner, /function ScannerStatus/);
  assert.doesNotMatch(scanner, /<ScannerStatus/);
});

test("scan result page keeps validation flow and improves scan experience", () => {
  const scan = read("src/app/scan/[token]/page.tsx");

  for (const expected of [
    "Valid Customer",
    "Reward Ready",
    "Suspicious Activity Alert",
    "Wrong Business",
    "Disabled Card",
    "Customer summary",
    "Card Number",
    "Last Visit",
    "Reason for multiple stamps",
  ]) {
    assert.match(scan, new RegExp(expected));
  }
});

test("manual scan token parser accepts scan URLs and direct tokens for existing validation route", () => {
  const scanLib = read("src/lib/scan.ts");

  assert.match(scanLib, /\[A-Za-z0-9_-\]\{3,160\}/);
  assert.match(scanLib, /\/scan\//);
});
