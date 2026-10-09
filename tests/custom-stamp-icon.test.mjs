/**
 * Stamp icons: the built-in set is Google's Noto artwork, and a business can
 * upload its own icon instead. Either way the same picture is drawn on the web
 * card and in Apple and Google Wallet.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");
const icons = await loadTs("src/lib/wallet/stamp-icons.ts");
const strip = await loadTs("src/lib/wallet/stamp-strip-svg.ts");
const image = await loadTs("src/lib/wallet/stamp-image.ts");
const marks = await loadTs("src/lib/stamp-icon-marks.ts");

test("the built-in icons are Google Noto artwork", () => {
  assert.match(read("src/lib/wallet/stamp-icons.ts"), /Noto Color Emoji \(Apache License 2\.0/);
  for (const icon of icons.STAMP_ICONS) {
    assert.equal(icon.viewBox, "0 0 128 128", `${icon.label} uses the Noto grid`);
  }
  // Gradient ids are prefixed per icon so side-by-side icons never clash.
  const ids = icons.STAMP_ICONS.flatMap((icon) => [...icon.body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  assert.equal(new Set(ids).size, ids.length, "no duplicate ids across icons");
  assert.ok(ids.every((id) => id.startsWith("noto-")));
});

test("an uploaded icon is drawn in every slot, faded for visits to go", () => {
  const svg = strip.drawStampStripSvg(2, 5, "⭐", "https://cdn.example/stamp-icons/a.png?x=1&y=2");
  assert.equal((svg.match(/<image href=/g) ?? []).length, 5);
  assert.equal((svg.match(/opacity="0.3"/g) ?? []).length, 3);
  assert.match(svg, /href="https:\/\/cdn\.example\/stamp-icons\/a\.png\?x=1&amp;y=2"/, "the URL is XML-escaped");
  // Without an upload, the built-in artwork is drawn.
  assert.doesNotMatch(strip.drawStampStripSvg(2, 5, "⭐"), /<image /);
});

test("an uploaded icon changes the wallet picture's address", () => {
  const builtIn = image.stampImagePath("abc", 3, 10, "⭐");
  const uploaded = image.stampImagePath("abc", 3, 10, "⭐", "https://cdn.example/stamp-icons/a.png");
  const other = image.stampImagePath("abc", 3, 10, "⭐", "https://cdn.example/stamp-icons/b.png");
  assert.notEqual(builtIn, uploaded);
  assert.notEqual(uploaded, other);
  // Still fits the stamp route's slug pattern.
  for (const path of [builtIn, uploaded]) assert.match(path, /\/\d{1,2}-of-\d{1,2}-[0-9a-f-]{1,32}\.png$/);
});

test("only an https icon address is ever kept on a design", () => {
  assert.equal(marks.customStampIconForDesign({ customStampIconUrl: "https://cdn.example/stamp-icons/a.png" }), "https://cdn.example/stamp-icons/a.png");
  assert.equal(marks.customStampIconForDesign({ customStampIconUrl: "javascript:alert(1)" }), null);
  assert.equal(marks.customStampIconForDesign({ customStampIconUrl: "http://cdn.example/a.png" }), null);
  assert.equal(marks.customStampIconForDesign(null), null);
});

test("uploads are checked, normalised and kept to the platform's own storage", () => {
  const action = read("src/app/dashboard/programs/photo-actions.ts");
  assert.match(action, /export async function uploadStampIconAction/);
  assert.match(action, /validateCsrfForm\(formData, "dashboard:program-design-studio"\)/);
  assert.match(action, /extension !== "png" && extension !== "webp"/, "no SVG: wallets need bitmaps and SVG can carry script");
  assert.match(action, /validateLogoBytes\(buffer, extension\)/);
  assert.match(action, /\.resize\(STAMP_ICON_SIZE, STAMP_ICON_SIZE, \{ fit: "contain"/);

  // A saved design may only point at the platform's icon storage...
  const studio = read("src/lib/design-studio.ts");
  assert.match(studio, /url\.startsWith\(`\$\{storageBase\}\/stamp-icons\/`\)/);
  // ...and the wallet picture route only ever fetches from there.
  const route = read("src/app/api/wallet/stamps/[programUuid]/[slug]/route.ts");
  assert.match(route, /url\.startsWith\(`\$\{storageBase\}\/stamp-icons\/`\)/);
  assert.match(route, /bytes\.length > CUSTOM_ICON_MAX_BYTES/);
});

test("Design Studio offers the upload and every surface draws it", () => {
  const form = read("src/components/ProgramDesignStudioForm.tsx");
  assert.match(form, /<CustomStampIconField value=\{customStampIconUrl\} onChange=\{setCustomStampIconUrl\} \/>/);
  assert.match(form, /name="customStampIconUrl"/);
  assert.match(read("src/lib/wallet-pass-view.ts"), /customIconUrl: customStampIconForDesign\(program\.cardDesign\)/);
  assert.match(read("src/components/wallet-pass/WalletPassCard.tsx"), /drawStampStripSvg\(banner\.filled, banner\.total, banner\.emoji, banner\.customIconUrl\)/);
});
