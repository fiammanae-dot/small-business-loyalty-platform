/**
 * The Programs list shows cashback as a program only once the owner has set it
 * up. Before that, a new business sees an offer to add cashback - never a
 * "Cashback - Off" row it did not create.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync("src/app/dashboard/programs/page.tsx", "utf8");

test("cashback counts as a shown program only after it is set up", () => {
  assert.match(page, /const cashbackSetUp = Boolean\(business\.cashbackSettings\);/);
  assert.match(page, /const shownProgramCount = programs\.length \+ \(cashbackSetUp \? 1 : 0\);/);
  assert.doesNotMatch(page, /const shownProgramCount = programs\.length \+ 1;/);
  assert.match(page, /\(cashbackSetUp \? ", including your cashback program" : ""\)/);
});

test("the cashback card and table row render only after it is set up", () => {
  assert.match(page, /\{cashbackSetUp \? \(\s*<CashbackProgramCard/);
  assert.match(page, /\{cashbackSetUp \? \(\s*<CashbackTableRow/);
  // No empty table header when there is nothing to list.
  assert.match(page, /const showProgramTable = cashbackSetUp \|\| programs\.length > 0;/);
});

test("before it is set up, the owner is offered cashback instead", () => {
  assert.match(page, /\{cashbackSetUp \? null : <CashbackSetupPrompt \/>\}/);
  assert.match(page, /function CashbackSetupPrompt\(\)/);
  assert.match(page, /Want to offer cashback\?/);
  assert.match(page, /<ButtonLink href="\/dashboard\/programs\/new\?type=cashback" variant="outline">\s*Set up cashback\s*<\/ButtonLink>/);
});
