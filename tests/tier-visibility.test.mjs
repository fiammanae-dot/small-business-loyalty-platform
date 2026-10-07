/**
 * Tier visibility vs membership packages.
 *
 * Visit-based loyalty tiers (Bronze/Silver/Gold/VIP) and named membership
 * packages are two different answers to two different questions, and "member"
 * collides between them ("Bronze White Lily Membership" is nonsense). So a
 * business that sells memberships hides tiers everywhere; a stamp-card business
 * keeps them. Tier DATA is preserved either way - this is display-only, driven
 * by one helper (areTiersVisible) off BusinessMembershipSettings.enabled.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("single source of truth: areTiersVisible is the inverse of membership-enabled", () => {
  const lib = read("src/lib/customer-tiers.ts");
  assert.match(lib, /export function areTiersVisible\(membershipEnabled\?: boolean \| null\): boolean \{\s*return !membershipEnabled;/);
});

test("owner settings always show the tier config section (tiers now layer with memberships)", () => {
  // Phase 3 of the program-type work: tiers are configurable even when
  // memberships are enabled, so the Settings gate was removed. Customer-facing
  // tier display is still governed separately by areTiersVisible (tested above).
  const settings = read("src/app/dashboard/settings/page.tsx");
  assert.doesNotMatch(settings, /membershipsEnabled \? null : <CustomerTiersSection/);
  assert.match(settings, /<CustomerTiersSection tierConfig=\{tierConfig\} \/>/);
});

test("dashboard customer surfaces gate tiers on membership", () => {
  const list = read("src/app/dashboard/customers/page.tsx");
  assert.match(list, /areTiersVisible\(business\.membershipSettings\?\.enabled\)/);
  // VIP segment, tier filter, tier column and tier badge are all gated.
  assert.match(list, /tiersVisible \? \[\{ key: "vip"/);
  assert.match(list, /tiersVisible \? <FilterSelect name="tier"/);
  assert.match(list, /tiersVisible \? <DataTableHeadCell[^>]*>Tier<\/DataTableHeadCell>/);
  assert.match(list, /tiersVisible \? \(\s*<DataTableCell>\s*<TierBadge/);
  const detail = read("src/app/dashboard/customers/[id]/page.tsx");
  assert.match(detail, /const tiersVisible = areTiersVisible\(business\.membershipSettings\?\.enabled\)/);
  assert.match(detail, /tiersVisible \? <StatusBadge tone="business">\{customerTier\.badgeIcon\}/);
  // The Overview tab's "Tier status" panel is gated too.
  assert.match(detail, /tiersVisible \? <TierDetailsPanel/);
});

test("branch and staff customer surfaces gate tiers on membership", () => {
  for (const path of [
    "src/app/branch/customers/page.tsx",
    "src/app/branch/customers/[id]/page.tsx",
    "src/app/staff/customers/page.tsx",
    "src/app/staff/customers/[id]/page.tsx",
  ]) {
    const src = read(path);
    assert.match(src, /areTiersVisible\(/, `${path} resolves tiersVisible`);
    assert.match(src, /tiersVisible \?/, `${path} gates a tier render`);
    assert.match(src, /businessMembershipSettings\.findUnique/, `${path} reads membership switch`);
  }
});

test("the customer-facing card hides tiers: wallet badge and tier panel", () => {
  const model = read("src/lib/card-render-model.ts");
  assert.match(model, /tiersHidden\?: boolean;/);
  assert.match(model, /tierBadge: design\.visibleSections\.tierBadge && !input\.tiersHidden/);
  // The hero wallet card reads the RAW design's visibleSections, so the model
  // must also suppress tierBadge on the returned design itself - otherwise the
  // badge leaks onto the card even when tiers are hidden.
  assert.match(model, /tierBadge: input\.tiersHidden \? false : design\.visibleSections\.tierBadge/);
  const hero = read("src/components/public-card/LoyaltyWalletCard.tsx");
  assert.match(hero, /design\.visibleSections\.tierBadge \?/);
  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /membershipSettings: true/);
  assert.match(page, /tiersHidden: !tiersVisible/);
  assert.match(page, /\{tiersVisible \? \(\s*<div[^>]*>\s*<TierStatusPanel/);
});

test("the Google Wallet pass hides the tier module for membership businesses", () => {
  const svc = read("src/lib/google-wallet/service.ts");
  assert.match(svc, /membershipSettings: true/);
  const mapper = read("src/lib/google-wallet/mapper.ts");
  assert.match(mapper, /sections\.tierBadge && !customer\.business\.membershipSettings\?\.enabled/);
});

test("scan counter and referral surfaces hide tiers for membership businesses", () => {
  const scan = read("src/app/scan/[token]/page.tsx");
  assert.match(scan, /areTiersVisible\(/);
  assert.match(scan, /tier=\{tiersVisible \? \(fromStoredTier/);
  assert.match(scan, /referrerTier=\{tiersVisible \? fromStoredTier/);
  const referral = read("src/app/referral/[code]/page.tsx");
  assert.match(referral, /const referrerTier = tiersVisible \? fromStoredTier/);
  const lookup = read("src/components/ReferralReferrerLookupPreview.tsx");
  assert.match(lookup, /showTier \? ` - \$\{fromStoredTier/);
});
