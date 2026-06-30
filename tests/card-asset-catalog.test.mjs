import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("asset catalog defines metadata-only Design Studio assets without persistence", () => {
  const catalog = read("src/lib/card-asset-catalog.ts");
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "export type Asset",
    "id: string",
    "category: AssetCategory",
    "industry: AssetIndustry",
    "label: string",
    "description: string",
    "previewKey: string",
    "futureSvgKey: string | null",
    "futureAnimationKey: string | null",
    "assetCatalog",
    "LAYOUT",
    "STAMP_ICON",
    "BACKGROUND",
    "PATTERN",
    "TYPOGRAPHY",
    "STAMP_JOURNEY",
  ]) {
    assert.match(catalog, new RegExp(expected));
  }

  assert.doesNotMatch(schema, /AssetCatalog|asset_catalog|DesignStudioAsset|design_studio_asset|futureSvgKey/);
});

test("asset catalog exposes lookup helpers and duplicate detection", () => {
  const catalog = read("src/lib/card-asset-catalog.ts");

  for (const expected of [
    "getAssetsByCategory",
    "getAssetsByIndustry",
    "getAsset",
    "getDefaultAssetsForIndustry",
    "getDuplicateAssetIds",
    "new Set<string>()",
    "duplicates.add(asset.id)",
  ]) {
    assert.match(catalog, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(catalog, /return assetCatalog\.filter\(\(asset\) => asset\.category === category\)/);
  assert.match(catalog, /return assetCatalog\.filter\(\(asset\) => asset\.industry === industry \|\| asset\.industry === "ALL"\)/);
  assert.match(catalog, /return assetCatalog\.find\(\(asset\) => asset\.id === id\) \?\? null/);
});

test("industry asset defaults reference catalog asset ids", () => {
  const catalog = read("src/lib/card-asset-catalog.ts");

  for (const expected of [
    "industryAssetDefaults",
    "BARBERSHOP",
    "BEAUTY_SALON",
    "CAR_WASH",
    "CAFE",
    "RESTAURANT",
    "GENERAL",
    'stampIcon: assetId("STAMP_ICON", "SCISSORS")',
    'stampIcon: assetId("STAMP_ICON", "LIPSTICK")',
    'stampIcon: assetId("STAMP_ICON", "WATER_DROP")',
    'stampIcon: assetId("STAMP_ICON", "COFFEE_CUP")',
    'stampIcon: assetId("STAMP_ICON", "PLATE")',
    'pattern: assetId("PATTERN", "SCISSORS")',
    'pattern: assetId("PATTERN", "BEAUTY_PATTERN")',
    'pattern: assetId("PATTERN", "WATER_BUBBLES")',
    'pattern: assetId("PATTERN", "COFFEE_BEANS")',
    'pattern: assetId("PATTERN", "FOOD_PATTERN")',
    'typography: assetId("TYPOGRAPHY", "PREMIUM")',
    'typography: assetId("TYPOGRAPHY", "LUXURY")',
    'typography: assetId("TYPOGRAPHY", "CLASSIC")',
  ]) {
    assert.match(catalog, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("asset catalog remains disconnected from live card rendering", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");

  for (const source of [publicCard, wallet, frontExport, backExport, preview]) {
    assert.doesNotMatch(source, /card-asset-catalog|assetCatalog|getAsset|getAssetsByCategory|getDefaultAssetsForIndustry/);
  }
});
