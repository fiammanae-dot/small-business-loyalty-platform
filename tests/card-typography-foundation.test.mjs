import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("card design foundation defines future typography presets without persistence", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "typographyPresets",
    "CLASSIC",
    "MODERN",
    "PREMIUM",
    "LUXURY",
    "PLAYFUL",
    "MINIMAL",
    "resolveTypographyPreset",
  ]) {
    assert.match(design, new RegExp(expected));
  }

  assert.match(design, /typographyPreset: "MODERN"/);
  assert.match(design, /if \(value === "system"\) \{\s*return "MODERN";\s*\}/);
  assert.doesNotMatch(schema, /typographyPreset|typography_preset|cardTypography|card_typography/);
});

test("industry design packs include recommended typography defaults", () => {
  const design = read("src/lib/card-design.ts");

  assert.match(design, /BARBERSHOP:[\s\S]*typographyPreset: "PREMIUM"/);
  assert.match(design, /BEAUTY_SALON:[\s\S]*typographyPreset: "LUXURY"/);
  assert.match(design, /CAR_WASH:[\s\S]*typographyPreset: "MODERN"/);
  assert.match(design, /CAFE:[\s\S]*typographyPreset: "CLASSIC"/);
  assert.match(design, /RESTAURANT:[\s\S]*typographyPreset: "PREMIUM"/);
  assert.match(design, /GENERAL:[\s\S]*\.\.\.defaultCardDesign/);
});

test("card render model exposes typography metadata for future renderers", () => {
  const model = read("src/lib/card-render-model.ts");

  assert.match(model, /typography: \{/);
  assert.match(model, /preset: CardDesign\["typographyPreset"\]/);
  assert.match(model, /headingStyle: string/);
  assert.match(model, /bodyStyle: string/);
  assert.match(model, /captionStyle: string/);
  assert.match(model, /emphasisStyle: string/);
  assert.match(model, /preset: design\.typographyPreset/);
  assert.match(model, /headingStyle: `\$\{design\.typographyPreset\.toLowerCase\(\)\}-heading`/);
});

test("typography presets are not applied to live card renderers yet", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");

  for (const source of [publicCard, wallet, frontExport, backExport, preview]) {
    assert.doesNotMatch(source, /typography\.|headingStyle|bodyStyle|captionStyle|emphasisStyle|resolveTypographyPreset/);
  }
});
