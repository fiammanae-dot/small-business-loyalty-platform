import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

function read(path) {
  return readFileSync(path, "utf8");
}

const icons = await loadTs("src/lib/wallet/stamp-icons.ts");
// stamp-image.ts pulls in sharp lazily (only inside drawStampStripPng), so the
// drawing and URL helpers load without it.
const image = await loadTs("src/lib/wallet/stamp-image.ts");

test("every shipped icon has artwork to draw", () => {
  assert.ok(icons.STAMP_ICONS.length >= 10);
  for (const icon of icons.STAMP_ICONS) {
    assert.ok(icon.emoji.length > 0, "icon needs a character");
    assert.ok(icon.label.trim().length > 0, `${icon.emoji} needs a label`);
    // Without a body there is nothing to put on the card - the whole point of
    // bundling the artwork instead of relying on a colour emoji font.
    assert.match(icon.body, /<(path|circle|ellipse|g)\b/, `${icon.emoji} has no shapes`);
  }
});

test("an unknown or missing icon falls back instead of drawing nothing", () => {
  assert.equal(icons.findStampIcon(null).emoji, icons.DEFAULT_STAMP_EMOJI);
  assert.equal(icons.findStampIcon("🦄").emoji, icons.DEFAULT_STAMP_EMOJI);
  assert.equal(icons.findStampIcon("☕").emoji, "☕");
});

test("earned stamps show the icon in full, the rest show a faded copy", () => {
  const svg = image.drawStampStripSvg(3, 10, "☕");
  const stamps = (svg.match(/<svg x=/g) ?? []).length;
  const faded = (svg.match(/opacity="0.3"/g) ?? []).length;
  assert.equal(stamps, 10, "ten stamps drawn");
  assert.equal(faded, 7, "seven faded (still to earn)");
  assert.equal(stamps - faded, 3, "three earned at full strength");
  // Remaining stamps are the same icon faded, not empty rings.
  assert.doesNotMatch(svg, /<circle /, "no empty rings");
});

test("the Apple wallet pass shows the live visit grid as its banner", () => {
  const mapper = read("src/lib/walletwallet/mapper.ts");
  // Memberships count down (filled = visits left); stamp cards count up.
  assert.match(read("src/lib/wallet-pass-view.ts"), /filled: isMembership \? membershipRemaining : collected/);
  // The grid (or the uploaded photo) is the strip banner.
  assert.match(mapper, /body\.stripURL = `\$\{baseUrl\}\$\{stampImagePath\(programUuid, banner\.filled, banner\.total, banner\.emoji\)\}`/);
  assert.match(mapper, /if \(banner\?\.kind === "photo"\) body\.stripURL = banner\.url/);
});

test("the picture stays narrow enough that Apple's strip shows every stamp", () => {
  // Apple centre-crops the strip banner to roughly 2.6:1; a wider picture loses
  // the outer stamps (a "4 of 6" card that only shows 4 ticks). Keep it <= ~2.5:1.
  const svg = image.drawStampStripSvg(4, 6, "⭐");
  const [, w, h] = svg.match(/width="(\d+)" height="(\d+)" viewBox/);
  assert.ok(Number(w) / Number(h) <= 2.5, `ratio ${(w / h).toFixed(2)} must be <= 2.5:1`);
  // All six visits are drawn: four filled (visits left) and two faded.
  assert.equal((svg.match(/<svg x=/g) ?? []).length, 6, "all six stamps drawn");
  assert.equal((svg.match(/opacity="0.3"/g) ?? []).length, 2, "two faded");
});

test("ten stamps wrap onto two rows so they stay readable", () => {
  // Measured on a full card so every stamp is drawn as an icon with x/y.
  const ys = [...image.drawStampStripSvg(10, 10, "☕").matchAll(/<svg x="[\d.]+" y="([\d.]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ys).size, 2, "two rows");
  // Anchored on the stamp wrapper: a bare y=" also matches cy=" inside the artwork.
  const fiveYs = [...image.drawStampStripSvg(5, 5, "☕").matchAll(/<svg x="[\d.]+" y="([\d.]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(fiveYs).size, 1, "five stamps fit on one row");
});

test("nonsense counts cannot produce a broken picture", () => {
  assert.doesNotThrow(() => image.drawStampStripSvg(99, 5, "☕"));
  assert.doesNotThrow(() => image.drawStampStripSvg(-4, 0, null));
  // More earned than the card holds must not draw extra stamps.
  const svg = image.drawStampStripSvg(99, 5, "☕");
  assert.equal((svg.match(/<svg x=/g) ?? []).length, 5);
});

test("the address changes when progress or icon changes, so Google refetches", () => {
  const a = image.stampImagePath("abc", 3, 10, "☕");
  assert.notEqual(a, image.stampImagePath("abc", 4, 10, "☕"), "a new stamp is a new address");
  assert.notEqual(a, image.stampImagePath("abc", 3, 10, "🚗"), "a new icon is a new address");
  // Cached forever by the route, so the path must pin every input.
  assert.match(a, /^\/api\/wallet\/stamps\/abc\/3-of-10-[0-9a-f-]+\.png$/);
});

test("the wallet pass puts the picture on the object, not the shared class", () => {
  const mapper = read("src/lib/google-wallet/mapper.ts");
  // A class is shared by every customer on the program: a hero image there
  // would show one person's progress to all of them.
  const objectStart = mapper.indexOf("buildGoogleWalletObjectPayload");
  assert.ok(mapper.indexOf("heroImage: stampImage") > objectStart);
  assert.doesNotMatch(mapper.slice(0, objectStart), /heroImage:/);
});
