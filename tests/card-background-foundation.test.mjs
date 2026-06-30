import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("card design foundation defines future background styles and patterns", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "cardBackgroundStyles",
    "SOLID",
    "GRADIENT",
    "PATTERN",
    "TEXTURE",
    "IMAGE",
    "INDUSTRY_PATTERN",
    "backgroundPatternPresets",
    "NONE",
    "SUBTLE_DOTS",
    "DIAGONAL_LINES",
    "WAVES",
    "COFFEE_BEANS",
    "SCISSORS",
    "WATER_BUBBLES",
    "FOOD_PATTERN",
    "BEAUTY_PATTERN",
    "resolveBackgroundStyle",
    "resolveBackgroundPattern",
  ]) {
    assert.match(design, new RegExp(expected));
  }

  assert.match(design, /backgroundStyle: "SOLID"/);
  assert.match(design, /backgroundPattern: "NONE"/);
  assert.match(design, /if \(value === "theme"\) \{\s*return "SOLID";\s*\}/);
  assert.doesNotMatch(schema, /backgroundPattern|background_pattern|cardBackgroundStyle|card_background_style/);
});

test("industry design packs carry future background defaults without applying them visually", () => {
  const design = read("src/lib/card-design.ts");
  const publicCard = read("src/app/card/[token]/page.tsx");
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");

  assert.match(design, /backgroundPattern: "SCISSORS"/);
  assert.match(design, /backgroundPattern: "BEAUTY_PATTERN"/);
  assert.match(design, /backgroundPattern: "WATER_BUBBLES"/);
  assert.match(design, /backgroundPattern: "COFFEE_BEANS"/);
  assert.match(design, /backgroundPattern: "FOOD_PATTERN"/);

  for (const source of [publicCard, wallet, frontExport, backExport, preview]) {
    assert.doesNotMatch(source, /backgroundPattern|COFFEE_BEANS|WATER_BUBBLES|BEAUTY_PATTERN|FOOD_PATTERN/);
  }
});

test("card render model exposes resolved background metadata for future renderers", () => {
  const model = read("src/lib/card-render-model.ts");

  assert.match(model, /backgroundPattern: CardDesign\["backgroundPattern"\]/);
  assert.match(model, /background: \{/);
  assert.match(model, /style: CardDesign\["backgroundStyle"\]/);
  assert.match(model, /pattern: CardDesign\["backgroundPattern"\]/);
  assert.match(model, /cardBackground: resolvedColors\.cardBackground/);
  assert.match(model, /pageBackground: resolvedColors\.pageBackground/);
});
