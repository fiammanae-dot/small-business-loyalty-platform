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
  // theme-driven colour and the picture, through the shared pass view
  assert.match(mapper, /const view = buildCashbackPassView\(\{/);
  assert.match(mapper, /cardTheme: cs\?\.cardTheme,/);
  assert.match(mapper, /photoUrl: absoluteUrl\(cs\?\.walletPhotoUrl, baseUrl\)/);
  const view = read("src/lib/wallet-pass-view.ts");
  assert.match(view, /cardTheme: input\.cashback\.cardTheme \?\? "BUSINESS_DEFAULT"/);
  assert.match(view, /banner: photo \? \{ kind: "photo", url: photo \} : null/);
  // hero picture as a top banner
  assert.match(mapper, /if \(banner\?\.kind === "photo"\) body\.stripURL = banner\.url/);
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
