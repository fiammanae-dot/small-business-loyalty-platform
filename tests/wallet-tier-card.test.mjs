/**
 * Tier is a stamp-program feature, not a separate wallet card. It rides on the
 * stamp program pass (never a membership pass) when the business runs tiers,
 * and a tier change refreshes the customer's existing program passes.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the stamp program pass carries the tier (Apple), gated on stamp programs + tiers", () => {
  const mapper = read("src/lib/walletwallet/mapper.ts");
  assert.match(mapper, /if \(!isMembership && business\.tierSetting\)/);
  assert.match(mapper, /const tierName = fromStoredTier\(/);
  assert.match(mapper, /secondaryFields\.push\(\{ label: "Tier", value: tierName/);
});

test("the stamp program pass carries the tier (Google), gated on stamp programs + tiers", () => {
  const mapper = read("src/lib/google-wallet/mapper.ts");
  assert.match(mapper, /!isMembership && customer\.business\.tierSetting[\s\S]*id: "tier"/);
});

test("there is no separate tier wallet card any more", () => {
  const mapper = read("src/lib/walletwallet/mapper.ts");
  assert.doesNotMatch(mapper, /buildTierPassBody/);
  const svc = read("src/lib/walletwallet/service.ts");
  assert.doesNotMatch(svc, /syncAppleTierPass/);
  assert.ok(!existsSync("src/app/api/wallet/apple/tier/[cardToken]/route.ts"), "tier route is gone");
  const share = read("src/components/CardShareActions.tsx");
  assert.doesNotMatch(share, /tierAppleWalletUrl/);
  assert.doesNotMatch(share, /Add Tier card to Apple Wallet/);
  const page = read("src/app/card/[token]/page.tsx");
  assert.doesNotMatch(page, /wallet\/apple\/tier/);
});

test("a tier change refreshes the customer's existing program passes", () => {
  const svc = read("src/lib/walletwallet/service.ts");
  assert.match(
    svc,
    /export async function syncAppleWalletAfterTierChange[\s\S]*appleWalletPass: \{ isNot: null \}[\s\S]*syncAppleWalletPassSafe\(m\.id\)/,
  );
});

test("every tier-change site still fires the tier-change hook", () => {
  for (const path of [
    "src/app/api/cron/tier-recalc/route.ts",
    "src/app/card/[token]/page.tsx",
    "src/app/dashboard/customers/[id]/page.tsx",
    "src/app/scan/actions.ts",
  ]) {
    assert.match(read(path), /syncAppleWalletAfterTierChange\(/, `${path} fires the tier-change hook`);
  }
});

test("wallet buttons are scoped per enrolled program, with cashback for everyone", () => {
  const share = read("src/components/CardShareActions.tsx");
  assert.match(share, /walletPrograms\?: \{ name: string; appleWalletUrl: string; googleWalletUrl: string \}\[\];/);
  assert.match(share, /walletPrograms && walletPrograms\.length > 0 \? \(/);
  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /const walletPrograms = programCards\.map\(/);
  assert.match(page, /walletPrograms=\{walletPrograms\}/);
});
