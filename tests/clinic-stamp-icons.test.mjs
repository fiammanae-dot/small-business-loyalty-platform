/**
 * Medical and skin-care stamp icons (syringe, tooth, laser, ...) for clinics.
 * Each one needs: a design key, its emoji, the browser artwork, and the PNG
 * copy the wallet picture renderer embeds. They are offered to clinics, beauty
 * salons and "Other" businesses, and a few lead the clinic recommendations.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const escape = (text) => text.replace(/[\\{}]/g, (c) => `\\${c}`);
const MEDICAL = {
  SYRINGE: ["1f489", "\\u{1F489}"],
  PILL: ["1f48a", "\\u{1F48A}"],
  STETHOSCOPE: ["1fa7a", "\\u{1FA7A}"],
  BANDAGE: ["1fa79", "\\u{1FA79}"],
  TOOTH: ["1f9b7", "\\u{1F9B7}"],
  DNA: ["1f9ec", "\\u{1F9EC}"],
  MICROSCOPE: ["1f52c", "\\u{1F52C}"],
  TEST_TUBE: ["1f9ea", "\\u{1F9EA}"],
  CLINIC: ["1f3e5", "\\u{1F3E5}"],
  MEDICAL_SYMBOL: ["2695-fe0f", "\\u2695\\uFE0F"],
  MENDING_HEART: ["2764-fe0f-200d-1fa79", "\\u2764\\uFE0F\\u200D\\u{1FA79}"],
  SPARKLING_HEART: ["1f496", "\\u{1F496}"],
  LASER: ["26a1", "\\u26A1"],
  SUN: ["2600-fe0f", "\\u2600\\uFE0F"],
  SPONGE: ["1f9fd", "\\u{1F9FD}"],
  SOAP: ["1f9fc", "\\u{1F9FC}"],
  BATHTUB: ["1f6c1", "\\u{1F6C1}"],
  FACE_MASSAGE: ["1f486", "\\u{1F486}"],
  LIPS: ["1f444", "\\u{1F444}"],
  EYE: ["1f441-fe0f", "\\u{1F441}\\uFE0F"],
  SAUNA: ["1f9d6", "\\u{1F9D6}"],
  THERMOMETER: ["1f321-fe0f", "\\u{1F321}\\uFE0F"],
  DOCTOR: ["1f9d1-200d-2695-fe0f", "\\u{1F9D1}\\u200D\\u2695\\uFE0F"],
  WOMAN_DOCTOR: ["1f469-200d-2695-fe0f", "\\u{1F469}\\u200D\\u2695\\uFE0F"],
  YOGA: ["1f9d8", "\\u{1F9D8}"],
  GLOWING_STAR: ["1f31f", "\\u{1F31F}"],
};

test("every clinic icon is a real stamp icon with artwork for the web and the wallet", () => {
  const design = read("src/lib/card-design.ts");
  const marks = read("src/lib/stamp-icon-marks.ts");
  const catalog = read("src/lib/wallet/stamp-icons.ts");
  const art = read("src/lib/wallet/stamp-icon-art.ts");
  assert.match(design, /  \.\.\.medicalStampIcons,\n\] as const;/);
  for (const [key, [file, mark]] of Object.entries(MEDICAL)) {
    assert.match(design, new RegExp(`export const medicalStampIcons = \\[[^\\]]*"${key}"`), key);
    assert.match(marks, new RegExp(`  ${key}: "${escape(mark)}",`), key);
    assert.equal(catalog.split(`"file": "${file}"`).length, 2, `${key} listed once`);
    assert.ok(existsSync(`public/stamp-icons/3d/${file}.webp`), `${key} webp`);
    assert.match(art, new RegExp(`"${file}": "iVBORw0KGgo`), `${key} png`);
  }
});

test("the catalog emoji matches the design mark, so the right picture is found", () => {
  const catalog = read("src/lib/wallet/stamp-icons.ts");
  for (const [file] of Object.values(MEDICAL)) {
    const emoji = String.fromCodePoint(...file.split("-").map((part) => parseInt(part, 16)));
    assert.ok(catalog.includes(`"emoji": "${emoji}",\n    "label": "`) && catalog.includes(`"file": "${file}"`), file);
    const at = catalog.indexOf(`"file": "${file}"`);
    assert.ok(catalog.lastIndexOf(`"emoji": "${emoji}"`, at) > catalog.lastIndexOf("{", at), file);
  }
});

test("clinics, beauty salons and Other businesses get the clinic icons; a cafe does not", () => {
  const studio = read("src/lib/design-studio.ts");
  assert.match(studio, /const MEDICAL_ICON_BUSINESS_TYPES: ReadonlySet<string> = new Set\(\["AESTHETIC_CLINIC", "BEAUTY_SALON", "OTHER"\]\);/);
  assert.match(studio, /businessType && MEDICAL_ICON_BUSINESS_TYPES\.has\(businessType\) \? medicalStampIcons : \[\]/);
  assert.match(studio, /\.\.\.fragranceStampIcons, \.\.\.medical\]/);
  assert.match(read("src/lib/card-design.ts"), /export const clinicStampIcons = \["SPARKLE", "GEM", "SYRINGE", "SPARKLING_HEART", "FACE_MASSAGE", "LIPS", "LASER", "TOOTH",/);
});
