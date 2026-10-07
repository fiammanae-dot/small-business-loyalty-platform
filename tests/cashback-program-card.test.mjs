/**
 * Phase 4 of making cashback a real program: it shows as a program-style card
 * in the Programs list (its name, card theme accent, "X% back" and rules),
 * instead of the small "business-wide features" status tile.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the cashback program card renders name, rate and theme accent", () => {
  const page = read("src/app/dashboard/programs/page.tsx");
  assert.match(page, /function CashbackProgramCard\(/);
  assert.match(page, /style=\{\{ backgroundColor: accent \}\}/);
  assert.match(page, /\{rate\}% back/);
  assert.match(page, /label="Cashback rate"/);
  assert.match(page, /Edit cashback card/);
});

test("the cashback card is fed from the saved cashback program fields", () => {
  const page = read("src/app/dashboard/programs/page.tsx");
  assert.match(page, /const cashbackName = business\.cashbackSettings\?\.name\?\.trim\(\) \|\| "Cashback"/);
  assert.match(page, /resolveCardThemeColors\(\{ cardTheme: business\.cashbackSettings\?\.cardTheme \?\? "BUSINESS_DEFAULT"/);
  assert.match(page, /name=\{cashbackName\}/);
  assert.match(page, /accent=\{cashbackAccent\}/);
});

test("cashback is no longer a business-wide feature tile", () => {
  const page = read("src/app/dashboard/programs/page.tsx");
  assert.doesNotMatch(page, /title="Cashback"\s*\n\s*enabled=\{cashbackEnabled\}/);
});
