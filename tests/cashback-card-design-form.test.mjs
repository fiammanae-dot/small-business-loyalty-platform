/**
 * Phase 2 of making cashback a real program: the setup page gets a card
 * designer - a name, the shared wallet-style (card theme) selector, and an
 * optional card picture - reusing the same primitives the program wizard uses.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("a cashback-scoped photo upload action exists", () => {
  const actions = read("src/app/dashboard/programs/photo-actions.ts");
  assert.match(actions, /export async function uploadCashbackPhotoAction/);
  assert.match(actions, /validateCsrfForm\(formData, "dashboard:cashback-settings"\)/);
});

test("the cashback photo field is photo-only and posts hero + url", () => {
  assert.ok(existsSync("src/components/CashbackPhotoField.tsx"), "CashbackPhotoField exists");
  const field = read("src/components/CashbackPhotoField.tsx");
  assert.match(field, /uploadCashbackPhotoAction/);
  assert.match(field, /name="walletHeroStyle" value="PHOTO"/);
  assert.match(field, /name="walletPhotoUrl"/);
  // no stamps option for cashback
  assert.doesNotMatch(field, /StampIconPicker/);
});

test("the cashback form has a name, the theme selector and the photo field", () => {
  const form = read("src/components/CashbackSetupForm.tsx");
  assert.match(form, /saveCashbackSettingsAction/);
  assert.match(form, /name="redirectTo" value="\/dashboard\/programs"/);
  assert.match(form, /<CardThemePreviewSelector selectedTheme=\{cardTheme\} businessName=\{businessName\} branding=\{branding\} \/>/);
  assert.match(form, /<CashbackPhotoField defaultPhotoUrl=\{walletPhotoUrl\} \/>/);
  assert.match(form, /name="name"/);
});

test("the cashback page feeds the design props into the form", () => {
  const page = read("src/app/dashboard/programs/new/page.tsx");
  assert.match(page, /name=\{cb\?\.name \?\? ""\}/);
  assert.match(page, /cardTheme=\{cb\?\.cardTheme \?\? "BUSINESS_DEFAULT"\}/);
  assert.match(page, /walletPhotoUrl=\{cb\?\.walletPhotoUrl \?\? null\}/);
  assert.match(page, /businessName=\{business\.name\}/);
  assert.match(page, /branding=\{resolveBranding\(business\.branding\)\}/);
});
