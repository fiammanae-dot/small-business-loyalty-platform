import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("card layout foundation defines future Design Studio layouts without persistence", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const style of ["CLASSIC", "MODERN", "PREMIUM", "MINIMAL", "LUXURY"]) {
    assert.match(design, new RegExp(style));
  }

  assert.match(design, /export const cardLayoutStyles/);
  assert.match(design, /export function resolveCardLayoutStyle/);
  assert.match(design, /layoutStyle: "CLASSIC"/);
  assert.match(design, /layoutStyle: resolveCardLayoutStyle\(input\?\.layoutStyle\)/);
  assert.doesNotMatch(schema, /cardLayoutStyle|card_layout_style|layout_style|CardDesignLayoutStyle/);
});

test("card layout resolver keeps legacy wallet layouts safe", () => {
  const design = read("src/lib/card-design.ts");

  assert.match(design, /if \(value === "wallet"\) \{\s*return "CLASSIC";\s*\}/);
  assert.match(design, /return resolveValue\("layoutStyle", value\)/);
});

test("card layout styles are not applied to live card renderers yet", () => {
  const walletShell = read("src/components/public-card/WalletCardShell.tsx");
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");
  const publicCard = read("src/app/card/[token]/page.tsx");

  for (const source of [walletShell, wallet, frontExport, backExport, preview, publicCard]) {
    assert.doesNotMatch(source, /cardLayoutStyles|resolveCardLayoutStyle|layoutStyle|PREMIUM|MINIMAL|LUXURY/);
  }
});
