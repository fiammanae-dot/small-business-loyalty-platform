/**
 * The customer's card page: a customer on a membership package sees no visit
 * tier (same rule as the dashboard), and everything around the pass follows the
 * business's Brand Assets colours instead of the platform's orange.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const page = read("src/app/card/[token]/page.tsx");

test("a membership-package customer sees no tier", () => {
  assert.match(page, /const tiersVisible = areTiersVisible\(membership\.business\.membershipSettings\?\.enabled\) && !primaryProgram\?\.isMembership;/);
  assert.match(page, /tiersHidden: !tiersVisible/);
  assert.match(page, /\{tiersVisible \? \(\s*<div className="mx-auto w-full max-w-\[360px\]">\s*<TierStatusPanel/);
  // Same rule as the dashboard's customer page.
  assert.match(read("src/app/dashboard/customers/[id]/page.tsx"), /const showTier = tiersVisible && !primaryIsMembership;/);
});

test("the page around the pass uses the brand colours", () => {
  // business-* classes (buttons, hovers, messages) read the brand variables...
  assert.match(page, /<BusinessBrandingProvider branding=\{resolveBusinessBranding\(membership\.business\.branding\)\}>/);
  // ...and the panels' accent is the brand primary colour, not a theme's orange.
  assert.match(page, /const primaryCardTheme = \{ \.\.\.primaryCardModel\.resolvedColors, accent: branding\.primaryColor \};/);
  for (const file of ["src/components/public-card/LoyaltyCardBackExport.tsx", "src/components/public-card/LoyaltyWalletCard.tsx"]) {
    assert.doesNotMatch(read(file), /#F97316|ring-orange/, `${file} still uses the platform orange`);
  }
});
