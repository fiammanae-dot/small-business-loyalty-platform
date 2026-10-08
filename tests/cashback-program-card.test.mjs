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
  assert.match(page, /function CashbackTableRow\(/);
  assert.match(page, /\{rate\}% back/);
  assert.match(page, /label="Cashback rate"/);
  assert.match(page, /Edit cashback card/);
});

test("the cashback card is fed from the saved cashback program fields", () => {
  const page = read("src/app/dashboard/programs/page.tsx");
  assert.match(page, /const cashbackName = business\.cashbackSettings\?\.name\?\.trim\(\) \|\| "Cashback"/);
  assert.match(page, /name=\{cashbackName\}/);
  assert.match(page, /rate=\{cashbackRate\}/);
});

test("cashback is no longer a business-wide feature tile", () => {
  const page = read("src/app/dashboard/programs/page.tsx");
  assert.doesNotMatch(page, /title="Cashback"\s*\n\s*enabled=\{cashbackEnabled\}/);
});

test("the cashback program card shows live performance stats", () => {
  const page = read("src/app/dashboard/programs/page.tsx");
  // aggregates computed on the page
  assert.match(page, /cashbackTransactions: \{ some: \{\} \}/);
  assert.match(page, /type: "EARN".*_sum: \{ amount: true, billAmount: true \}/s);
  assert.match(page, /type: "SPEND"/);
  assert.match(page, /_sum: \{ cashbackBalance: true \}/);
  // rendered on the card
  // stats now render as label/value rows (mobile card) and table cells (desktop row)
  assert.match(page, /label="Members in cashback"/);
  assert.match(page, /label="Spend earning cashback"/);
  assert.match(page, /label="Cashback given"/);
  assert.match(page, /label="Outstanding balance"/);
});
