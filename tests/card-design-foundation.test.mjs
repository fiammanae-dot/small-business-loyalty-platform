import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("card design foundation defines future Design Studio fields without persistence", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "export type CardDesign",
    "version",
    "layoutStyle",
    "cardStyle",
    "stampJourneyStyle",
    "stampIcon",
    "progressStyle",
    "typographyPreset",
    "backgroundStyle",
    "backgroundPattern",
    "decorationStyle",
    "rewardStyle",
    "footerStyle",
    "animationStyle",
    "visibleSections",
    "templateId",
    "defaultCardDesign",
    "resolveCardDesign",
  ]) {
    assert.match(design, new RegExp(expected));
  }

  assert.doesNotMatch(schema, /layoutStyle|templateId/);
});

test("card theme resolver prefers saved program design while preserving legacy theme previews", () => {
  const themes = read("src/lib/card-themes.ts");
  const publicCard = read("src/app/card/[token]/page.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");

  assert.match(themes, /cardDesign\?: CardDesignInput/);
  assert.match(themes, /const design = resolveCardDesign\(cardDesign\)/);
  assert.match(themes, /cardDesign \? getCardThemeForCardDesign\(design\) : cardTheme/);
  assert.match(publicCard, /programMembership\.loyaltyProgram\.cardDesign as CardDesignInput/);
  assert.match(publicCard, /resolveCardThemeColors\(\{ cardTheme: programMembership\.loyaltyProgram\.cardTheme, branding, cardDesign: programCardDesign \}\)/);
  assert.match(preview, /resolveCardThemeColors\(\{ cardTheme: previewTheme, branding \}\)/);
  assert.doesNotMatch(preview, /resolveCardDesign\(\)/);
});

test("customer-facing card components consume saved Design Studio metadata safely", () => {
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const saveButton = read("src/components/SaveCardImageButton.tsx");

  assert.match(wallet, /cardDesign\?: CardDesignInput/);
  assert.match(wallet, /resolveCardDesign\(cardDesign\)/);
  assert.match(wallet, /design\.visibleSections/);
  assert.match(wallet, /design\.stampJourneyStyle/);
  assert.match(wallet, /design\.stampIcon/);
  assert.match(wallet, /design\.rewardStyle/);
  assert.match(wallet, /design\.typographyPreset/);
  assert.match(frontExport, /resolveCardDesign\(wallet\.cardDesign\)/);
  assert.match(backExport, /resolveCardDesign\(wallet\.cardDesign\)/);
  assert.doesNotMatch(saveButton, /cardDesign|templateId|layoutStyle/);
});
