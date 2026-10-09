/**
 * Phase 3 of making cashback a real program: the Apple cashback card is built
 * from the cashback program's own name, card theme and picture instead of the
 * generic business branding, and a design edit refreshes cards already added.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the cashback pass uses the program's name, theme and picture", () => {
  const mapper = read("src/lib/walletwallet/mapper.ts");
  // name
  assert.match(mapper, /const cardName = cs\?\.name\?\.trim\(\) \|\| "Cashback"/);
  assert.match(mapper, /description: `\$\{cardName\} - \$\{businessName\}`/);
  // theme-driven colour, from the same resolver every other wallet card uses
  assert.match(mapper, /resolveWalletCardColors\(\{\s*cardTheme: cs\?\.cardTheme \?\? "BUSINESS_DEFAULT",\s*branding,\s*cardDesign: \(cs\?\.cardDesign \?\? undefined\) as CardDesignInput,\s*\}\)\.background/);
  assert.doesNotMatch(mapper, /hexColor\(themeColors\.accent\)/);
  // hero picture as a top banner
  assert.match(mapper, /const photoUrl = absoluteUrl\(cs\?\.walletPhotoUrl, baseUrl\)/);
  assert.match(mapper, /if \(photoUrl\) body\.stripURL = photoUrl/);
});

test("the feature-pass type carries the cashback design fields", () => {
  const mapper = read("src/lib/walletwallet/mapper.ts");
  assert.match(mapper, /cardTheme\?: CardTheme \| null;/);
  assert.match(mapper, /walletPhotoUrl\?: string \| null;/);
});

test("a cashback design edit refreshes cards already added", () => {
  const svc = read("src/lib/walletwallet/service.ts");
  assert.match(svc, /export async function refreshBusinessCashbackPasses\(businessId: number\)/);
  assert.match(svc, /kind: "CASHBACK"/);
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /await refreshBusinessCashbackPasses\(user\.businessId\)/);
});
