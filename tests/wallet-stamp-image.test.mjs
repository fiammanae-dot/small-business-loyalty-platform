import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

async function importTs(path, subs = {}) {
  let source = read(path);
  for (const [from, to] of Object.entries(subs)) source = source.replace(from, to);
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

const icons = await importTs("src/lib/wallet/stamp-icons.ts");
const image = await importTs("src/lib/wallet/stamp-image.ts", {
  'from "@/lib/wallet/stamp-icons"': `from "data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(read("src/lib/wallet/stamp-icons.ts"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString("base64")}"`,
});

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

test("earned stamps show the icon, the rest show an empty ring", () => {
  const svg = image.drawStampStripSvg(3, 10, "☕");
  const icons = (svg.match(/<svg x=/g) ?? []).length;
  const rings = (svg.match(/<circle /g) ?? []).length;
  assert.equal(icons, 3, "three earned");
  assert.equal(rings, 7, "seven still to earn");
  // A faded copy of the icon was tried first and rejected: flattening arbitrary
  // emoji turns some of them (a coffee cup) into an unreadable blob.
  assert.doesNotMatch(svg, /ghost/, "no ghosted icons");
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
