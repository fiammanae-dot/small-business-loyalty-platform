/**
 * One "Add to Wallet" button per device: an iPhone only sees Apple Wallet, an
 * Android phone only Google Wallet, and a computer a QR code to open the card
 * on the phone. Staff screens keep both buttons.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");
const platform = await loadTs("src/lib/wallet-platform.ts");

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MAC_OR_IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

test("each device gets the wallet it can open", () => {
  assert.equal(platform.detectWalletPlatform(IPHONE), "apple");
  assert.equal(platform.detectWalletPlatform(ANDROID), "google");
  assert.equal(platform.detectWalletPlatform(WINDOWS), "desktop");
  assert.equal(platform.detectWalletPlatform(null), "desktop");
});

test("an iPad (which reports itself as a Mac) is recognised in the browser", () => {
  assert.equal(platform.detectWalletPlatform(MAC_OR_IPAD), "desktop");
  assert.equal(platform.refineWalletPlatformInBrowser("desktop", MAC_OR_IPAD, 5), "apple", "touch screen = iPad");
  assert.equal(platform.refineWalletPlatformInBrowser("desktop", MAC_OR_IPAD, 0), "desktop", "no touch = a real Mac");
  assert.equal(platform.refineWalletPlatformInBrowser("google", ANDROID, 5), "google");
});

test("the customer's card page shows one button, a QR on computers, and hides an unusable WhatsApp button", () => {
  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /const walletPlatform = detectWalletPlatform\(\(await headers\(\)\)\.get\("user-agent"\)\);/);
  assert.match(page, /walletPlatform=\{walletPlatform\}/);
  assert.match(page, /cardQrCode=\{cardQrCode\}/);
  assert.match(page, /hideUnavailableWhatsApp/);

  const share = read("src/components/CardShareActions.tsx");
  assert.match(share, /const showApple = platform !== "google" && platform !== "desktop";/);
  assert.match(share, /const showGoogle = platform !== "apple" && platform !== "desktop";/);
  assert.match(share, /platform === "desktop" \? \(/);
  assert.match(share, /Scan with your phone/);
  // The cashback card is Apple-only, so it is only offered where Apple Wallet exists.
  assert.match(share, /cashbackAppleWalletUrl && showApple/);
  assert.match(share, /const showWhatsApp = Boolean\(whatsappUrl\) \|\| !hideUnavailableWhatsApp;/);
});

test("staff screens keep both buttons (no device decides for them)", () => {
  for (const file of ["src/app/dashboard/customers/[id]/page.tsx", "src/app/staff/customers/[id]/page.tsx", "src/app/branch/customers/[id]/page.tsx"]) {
    assert.doesNotMatch(read(file), /walletPlatform=/, `${file} must not pick a wallet for staff`);
  }
});
