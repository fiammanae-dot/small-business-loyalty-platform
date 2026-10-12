/**
 * Fragrance stamp icons (perfume bottle, oud wood, candle, ...) for perfume,
 * oud and gift shops. Each one needs: a design key, its emoji, the browser
 * artwork, and the PNG copy the wallet picture renderer embeds.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const FRAGRANCE = {
  PERFUME_BOTTLE: ["1f9f4", "\\\\u\\{1F9F4\\}"],
  OUD_WOOD: ["1fab5", "\\\\u\\{1FAB5\\}"],
  OIL_LAMP: ["1fa94", "\\\\u\\{1FA94\\}"],
  CANDLE: ["1f56f-fe0f", "\\\\u\\{1F56F\\}\\\\uFE0F"],
  SCENT: ["1f4a8", "\\\\u\\{1F4A8\\}"],
  AMPHORA: ["1f3fa", "\\\\u\\{1F3FA\\}"],
  HERBS: ["1f33f", "\\\\u\\{1F33F\\}"],
  LEAVES: ["1f343", "\\\\u\\{1F343\\}"],
  CRESCENT_MOON: ["1f319", "\\\\u\\{1F319\\}"],
  PALM_TREE: ["1f334", "\\\\u\\{1F334\\}"],
  RIBBON: ["1f380", "\\\\u\\{1F380\\}"],
  SHOPPING_BAGS: ["1f6cd-fe0f", "\\\\u\\{1F6CD\\}\\\\uFE0F"],
  JAR: ["1fad9", "\\\\u\\{1FAD9\\}"],
};

test("every fragrance icon is a real stamp icon with artwork for the web and the wallet", () => {
  const design = read("src/lib/card-design.ts");
  const marks = read("src/lib/stamp-icon-marks.ts");
  const catalog = read("src/lib/wallet/stamp-icons.ts");
  const art = read("src/lib/wallet/stamp-icon-art.ts");
  assert.match(design, /  \.\.\.fragranceStampIcons,\n/);
  for (const [key, [file, mark]] of Object.entries(FRAGRANCE)) {
    assert.match(design, new RegExp(`export const fragranceStampIcons = \\[[^\\]]*"${key}"`), key);
    assert.match(marks, new RegExp(`  ${key}: "${mark}",`), key);
    assert.equal(catalog.split(`"file": "${file}"`).length, 2, `${key} listed once`);
    assert.ok(existsSync(`public/stamp-icons/3d/${file}.webp`), `${key} webp`);
    assert.match(art, new RegExp(`"${file}": "iVBORw0KGgo`), `${key} png`);
  }
});

test("fragrance icons are offered to every type of business in Design Studio", () => {
  const studio = read("src/lib/design-studio.ts");
  assert.match(studio, /\.\.\.generalStampIcons, \.\.\.flowerStampIcons, \.\.\.fragranceStampIcons[,\]]/);
});
