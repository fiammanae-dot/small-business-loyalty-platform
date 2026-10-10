/**
 * Flower stamp icons (tulip, rose, water lily, ...) for businesses whose
 * packages are named after flowers. Each one needs: a design key, its emoji,
 * the browser artwork, and the PNG copy the wallet picture renderer embeds.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const FLOWERS = {
  TULIP: "1f337",
  ROSE: "1f339",
  WATER_LILY: "1fab7",
  HIBISCUS: "1f33a",
  CHERRY_BLOSSOM: "1f338",
  SUNFLOWER: "1f33b",
  DAISY: "1f33c",
  HYACINTH: "1fabb",
  BOUQUET: "1f490",
};

test("every flower is a real stamp icon with artwork for the web and the wallet", () => {
  const design = read("src/lib/card-design.ts");
  const marks = read("src/lib/stamp-icon-marks.ts");
  const catalog = read("src/lib/wallet/stamp-icons.ts");
  const art = read("src/lib/wallet/stamp-icon-art.ts");
  assert.match(design, /\.\.\.flowerStampIcons,\n\] as const;/);
  for (const [key, file] of Object.entries(FLOWERS)) {
    assert.match(design, new RegExp(`export const flowerStampIcons = \\[[^\\]]*"${key}"`), key);
    assert.match(marks, new RegExp(`  ${key}: "\\\\u\\{${file.toUpperCase()}\\}",`), key);
    assert.match(catalog, new RegExp(`"file": "${file}"`), key);
    assert.ok(existsSync(`public/stamp-icons/3d/${file}.webp`), `${key} webp`);
    assert.match(art, new RegExp(`"${file}": "iVBORw0KGgo`), `${key} png`);
  }
});

test("flowers are offered to every type of business in Design Studio", () => {
  const studio = read("src/lib/design-studio.ts");
  assert.match(studio, /\.\.\.generalStampIcons, \.\.\.flowerStampIcons\]/);
});
