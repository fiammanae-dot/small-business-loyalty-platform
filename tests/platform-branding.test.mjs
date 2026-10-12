/**
 * The Loyalty Card UAE brand (ring-and-dot symbol + "loyalty card / uae"
 * wordmark) is used for the site header, sign-in pages, workspaces, favicon,
 * home-screen icon, link previews and the Google Wallet fallback logo.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the brand artwork and icons are in place", () => {
  for (const file of [
    "public/brand/loyalty-card-uae.png",
    "public/brand/loyalty-card-uae-white.png",
    "public/brand/icon-192.png",
    "public/brand/icon-512.png",
    "public/brand/icon-maskable-512.png",
    "src/app/favicon.ico",
    "src/app/icon.svg",
    "src/app/apple-icon.png",
    "src/app/opengraph-image.png",
    "public/logo.png",
  ]) {
    assert.ok(existsSync(file), file);
  }
  assert.match(read("src/app/icon.svg"), /fill="#F26A21"/);
  const manifest = read("src/app/manifest.ts");
  assert.match(manifest, /name: "Loyalty Card UAE"/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.match(read("src/app/layout.tsx"), /themeColor: "#141210"/);
});

test("every platform logo uses the brand, not the old LC monogram or diamond", () => {
  for (const file of [
    "src/components/DashboardShell.tsx",
    "src/components/marketing/MarketingLayout.tsx",
    "src/app/page.tsx",
    "src/app/login/page.tsx",
    "src/app/login/2fa/page.tsx",
    "src/app/forgot-password/page.tsx",
    "src/app/change-password/page.tsx",
    "src/app/reset-password/page.tsx",
    "src/app/account/two-factor/setup/page.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /<BrandLockup /, file);
    assert.doesNotMatch(source, />\s*LC\s*</, file);
    assert.doesNotMatch(source, /rotate-45 rounded-\[7px\] bg-orange-500/, file);
  }
  for (const file of ["src/app/card/[token]/page.tsx", "src/app/referral/[code]/page.tsx", "src/app/join/program/[token]/page.tsx"]) {
    assert.match(read(file), /<BrandMark className="h-7 w-7" \/>/, file);
  }
  // The dark site footer uses the white version.
  assert.match(read("src/app/page.tsx"), /<BrandLockup tone="light"/);
});
