/**
 * The web card, the Apple pass and the Google pass must look like one card.
 *
 * They used to drift because each surface had its own rule: Apple painted the
 * raw brand primary colour while Google and the web followed the program's
 * theme, and the wallet stamp picture drew a different icon (stampEmoji) from
 * the one the web card drew (design.stampIcon). These tests pin the single
 * source each surface now reads.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");

async function importTs(path) {
  const js = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

test("one resolver decides the wallet card colour", () => {
  const themes = read("src/lib/card-themes.ts");
  assert.match(themes, /export function resolveWalletCardColors\(/);
  // Built on the same theme the web card renders...
  assert.match(themes, /const theme = resolveCardThemeColors\(\{ cardTheme, branding, cardDesign \}\);/);
  // ...but "Brand colour" is always the brand primary: a pass has no gradient,
  // so the web theme's white fallback for an unreadable gradient must not apply.
  assert.match(themes, /theme\.value === "BUSINESS_DEFAULT" \? firstHexColor\(branding\.primaryColor\) : firstHexColor\(theme\.cardBackground\)/);
  assert.match(read("src/lib/wallet-pass-view.ts"), /resolveWalletCardColors\(input\)/);
});

test("Google and Apple both paint the colour from that resolver", () => {
  const google = read("src/lib/google-wallet/mapper.ts");
  assert.match(google, /hexBackgroundColor: walletColors\.background/);
  assert.doesNotMatch(google, /function resolveHexBackgroundColor/);

  const apple = read("src/lib/walletwallet/mapper.ts");
  assert.match(apple, /const color = hexColor\(view\.colors\.background\)/);
  // The old rule ignored the program's theme and design entirely.
  assert.doesNotMatch(apple, /hexColor\(branding\.primaryColor\)/);
  assert.doesNotMatch(apple, /resolveCardThemeColors/);
});

test("every surface draws the stamp icon chosen in the card design", () => {
  const route = read("src/app/api/wallet/stamps/[programUuid]/[slug]/route.ts");
  assert.match(route, /stampEmojiForDesign\(program\.cardDesign\)/);
  assert.doesNotMatch(route, /program\.stampEmoji/);

  // Both passes take the icon from the shared view, which reads the design.
  assert.match(read("src/lib/wallet-pass-view.ts"), /emoji: stampEmojiForDesign\(program\.cardDesign\)/);
  for (const mapper of ["src/lib/google-wallet/mapper.ts", "src/lib/walletwallet/mapper.ts"]) {
    const source = read(mapper);
    assert.match(source, /banner\.emoji\)/, `${mapper} must draw the view's icon`);
    assert.doesNotMatch(source, /\.stampEmoji[,)]/, `${mapper} must not read the old icon column`);
  }

  const marks = read("src/lib/stamp-icon-marks.ts");
  assert.match(marks, /export function stampEmojiForDesign\(/);
  assert.match(marks, /resolveCardDesign\(cardDesign as CardDesignInput\)\.stampIcon/);
});

test("the web card draws the same artwork as the wallet picture", () => {
  const graphic = read("src/components/design-studio/StampIconGraphic.tsx");
  assert.match(graphic, /findStampIcon\(getStampEmoji\(stampIcon\)\)/);
  assert.match(graphic, /viewBox="0 0 36 36"/);
  // Not the phone's emoji font, which differs between iPhone, Android and Windows.
  assert.doesNotMatch(graphic, /Apple Color Emoji/);
});

test("every icon the designer offers has wallet artwork", async () => {
  const icons = await importTs("src/lib/wallet/stamp-icons.ts");
  const marks = read("src/lib/stamp-icon-marks.ts");
  const entries = [...marks.matchAll(/^\s*([A-Z_]+): "([^"]*)",\s*$/gm)].map(([, name, escaped]) => [
    name,
    Function(`return "${escaped}"`)(),
  ]);
  assert.ok(entries.length >= 30, "the designer's icon list was read");
  for (const [name, emoji] of entries) {
    assert.equal(icons.findStampIcon(emoji).emoji, emoji, `${name} (${emoji}) has no artwork and would fall back to the tick`);
  }
});

test("the stamp icon is picked once, in the card design", () => {
  const field = read("src/components/WalletCardPictureField.tsx");
  assert.doesNotMatch(field, /StampIconPicker/);
  assert.doesNotMatch(field, /name="stampEmoji"/);

  const actions = read("src/app/dashboard/programs/actions.ts");
  const studio = actions.slice(actions.indexOf("updateProgramDesignStudioAction"));
  assert.match(studio, /stampEmoji: stampEmojiForDesign\(cardDesign\)/);
});
