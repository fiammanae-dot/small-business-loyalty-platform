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

test("the cashback setup is a two-step wizard like stamp/membership", () => {
  const form = read("src/components/CashbackSetupForm.tsx");
  assert.match(form, /^"use client";/);
  assert.match(form, /function WizardProgress/);
  assert.match(form, /useState<1 \| 2>\(1\)/);
  assert.match(form, /Step \{step\} of 2/);
  assert.match(form, /Continue to card design/);
  // step 1 can never submit the form; only the final step saves
  assert.match(form, /if \(step !== 2\) event\.preventDefault\(\)/);
  // step 1 = rules, step 2 = design
  assert.match(form, /step === 1 \? "grid gap-5" : "hidden"/);
  assert.match(form, /step === 2 \? "grid gap-6" : "hidden"/);
  // rules live in step 1, theme + picture in step 2
  const step1 = form.slice(form.indexOf('step === 1 ? "grid gap-5"'), form.indexOf('step === 2 ? "grid gap-6"'));
  assert.match(step1, /name="ratePercent"/);
  const step2 = form.slice(form.indexOf('step === 2 ? "grid gap-6"'));
  assert.match(step2, /CardThemePreviewSelector/);
  assert.match(step2, /CashbackPhotoField/);
});
