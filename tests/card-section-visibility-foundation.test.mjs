import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("card design foundation defines future section visibility without persistence", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "cardSections",
    "CardSection",
    "CardSectionVisibility",
    "defaultVisibleCardSections",
    "resolveVisibleSections",
    "logo",
    "businessName",
    "customerName",
    "tierBadge",
    "rewardBox",
    "progress",
    "qr",
    "footer",
    "referral",
    "visits",
    "programName",
  ]) {
    assert.match(design, new RegExp(expected));
  }

  assert.match(design, /visibleSections: defaultVisibleCardSections/);
  assert.match(design, /visibleSections: resolveVisibleSections\(input\?\.visibleSections\)/);
  assert.doesNotMatch(schema, /visibleSections|visible_sections|cardSections|card_sections/);
});

test("section visibility resolver is defensive and defaults every current section on", () => {
  const design = read("src/lib/card-design.ts");

  for (const section of [
    "logo",
    "businessName",
    "customerName",
    "tierBadge",
    "rewardBox",
    "progress",
    "qr",
    "footer",
    "referral",
    "visits",
    "programName",
  ]) {
    assert.match(design, new RegExp(`${section}: true`));
  }

  assert.match(design, /if \(!value \|\| typeof value !== "object" \|\| Array\.isArray\(value\)\)/);
  assert.match(design, /\[section\]: typeof input\[section\] === "boolean" \? input\[section\] : defaultVisibleCardSections\[section\]/);
});

test("card render model section visibility is applied by customer-facing renderers", () => {
  const model = read("src/lib/card-render-model.ts");
  const publicCard = read("src/app/card/[token]/page.tsx");
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");

  assert.match(model, /sectionVisibility: CardSectionVisibility/);
  assert.match(model, /visibleSections: CardSectionVisibility/);
  assert.match(model, /sectionVisibility: design\.visibleSections/);
  assert.match(model, /rewardBox: design\.visibleSections\.rewardBox && hasProgram/);
  assert.match(model, /programName: design\.visibleSections\.programName && hasProgram/);

  assert.match(publicCard, /cardDesign: primaryCardModel\.design/);
  assert.match(wallet, /visibleSections\.logo/);
  assert.match(wallet, /visibleSections\.rewardBox/);
  assert.match(frontExport, /LoyaltyWalletCard/);
  assert.match(backExport, /visibleSections\.qr/);
  assert.doesNotMatch(preview, /resolveVisibleSections/);
});
