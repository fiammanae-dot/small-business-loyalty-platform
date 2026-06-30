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
    "templateId",
    "defaultCardDesign",
    "resolveCardDesign",
  ]) {
    assert.match(design, new RegExp(expected));
  }

  assert.doesNotMatch(schema, /cardDesign|card_design|layoutStyle|templateId/);
});

test("card theme resolver accepts card design without changing stored theme behavior", () => {
  const themes = read("src/lib/card-themes.ts");
  const publicCard = read("src/app/card/[token]/page.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");

  assert.match(themes, /cardDesign\?: CardDesignInput/);
  assert.match(themes, /resolveCardDesign\(cardDesign\)/);
  assert.match(themes, /getCardThemeDefinition\(cardTheme\)/);
  assert.match(publicCard, /const cardDesign = resolveCardDesign\(\)/);
  assert.match(publicCard, /resolveCardThemeColors\(\{ cardTheme: programMembership\.loyaltyProgram\.cardTheme, branding, cardDesign \}\)/);
  assert.match(preview, /const cardDesign = resolveCardDesign\(\)/);
  assert.match(preview, /resolveCardThemeColors\(\{ cardTheme: previewTheme, branding, cardDesign \}\)/);
});

test("Design Studio phase 0 keeps customer-facing card components unchanged", () => {
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const saveButton = read("src/components/SaveCardImageButton.tsx");

  for (const source of [wallet, frontExport, backExport, saveButton]) {
    assert.doesNotMatch(source, /CardDesign|cardDesign|templateId|layoutStyle/);
  }
});
