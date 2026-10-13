/**
 * The Loyalty Card UAE brand (ring-and-dot symbol + "loyalty card / uae"
 * wordmark) is used for the site header, sign-in pages, workspaces, favicon,
 * home-screen icon, link previews and the Google Wallet fallback logo.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the brand colours are tokens, and the old oranges are gone from the platform", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /--brand-orange: #F26A21;/);
  assert.match(css, /--brand-orange-deep: #C2410C;/);
  assert.match(css, /--brand-ink: #141210;/);
  assert.match(css, /--accent: var\(--brand-orange\);/);
  assert.match(css, /--color-orange-500: var\(--brand-orange\);/);
  for (const file of ["src/app/page.tsx", "src/components/marketing/MarketingLayout.tsx", "src/components/DashboardShell.tsx", "src/lib/business-branding.ts", "src/lib/design-tokens.ts"]) {
    assert.doesNotMatch(read(file), /#F97316|#EA580C|#E86A33|#C24E1E|#FF5A0A/i, file);
  }
});

test("the brand artwork and icons are in place", () => {
  for (const file of [
    "public/brand/logo-horizontal-full-colour.svg",
    "public/brand/logo-horizontal-white.svg",
    "public/brand/logo-horizontal-on-orange.svg",
    "public/brand/logo-horizontal-black.svg",
    "public/brand/logo-stacked-full-colour.svg",
    "public/brand/logo-stacked-white.svg",
    "public/brand/logo-stacked-on-orange.svg",
    "public/brand/logo-stacked-black.svg",
    "public/brand/icon-full-colour.svg",
    "public/brand/app-icon-dark.svg",
    "public/brand/app-icon-orange.svg",
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
  // The tab icon is the plain symbol: ink ring (white on a dark tab bar), orange dot, no background.
  const icon = read("src/app/icon.svg");
  assert.doesNotMatch(icon, /<rect/);
  assert.match(icon, /prefers-color-scheme:dark/);
  assert.match(icon, /fill="#F26A21"/);
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
  // The dark site footer uses the white version; the sign-in page the stacked one.
  assert.match(read("src/app/page.tsx"), /<BrandLockup tone="light"/);
  assert.match(read("src/app/login/page.tsx"), /<BrandLockup variant="stacked"/);
  // Posters carry a "Powered by" lockup instead of plain text.
  for (const file of ["src/app/dashboard/programs/[id]/join-poster/page.tsx", "src/app/branch/programs/[id]/join-poster/page.tsx", "src/app/dashboard/programs/cashback/join-poster/page.tsx"]) {
    assert.match(read(file), /<PoweredByBrand \/>/, file);
    assert.doesNotMatch(read(file), /tracking-\[0\.24em\][^>]*>Loyalty Card UAE</, file);
  }
});
