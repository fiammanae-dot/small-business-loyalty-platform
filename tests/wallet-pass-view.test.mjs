/**
 * The shared wallet pass view: the one description of a customer's card that
 * the Apple pass, the Google pass, the web "Open Card" page and the design
 * previews all render. These tests exercise it directly.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const view = await loadTs("src/lib/wallet-pass-view.ts");
const themes = await loadTs("src/lib/card-themes.ts");
const read = (path) => readFileSync(path, "utf8");

const branding = {
  primaryColor: "#0EA5E9",
  secondaryColor: "#0369A1",
  backgroundColor: "#FFFFFF",
  textColor: "#111827",
  buttonColor: "#0EA5E9",
};

const stampProgram = ({ program, ...overrides } = {}) => ({
  businessName: "The Skin Lab",
  logoUrl: "/logo.png",
  branding,
  customerName: "Mina Hanna",
  progress: 3,
  ...overrides,
  program: { name: "Glow Card", isMembership: false, requiredStamps: 10, cardDesign: { layoutStyle: "CLASSIC", stampIcon: "SPARKLE" }, ...program },
});

test("a stamp card: visits header, program/tier/member row, live stamp picture", () => {
  const pass = view.buildProgramPassView(stampProgram({ tierName: "Silver", reward: { ready: false, visitsToNext: 7 } }));
  assert.deepEqual(pass.header, { label: "Visits", value: "3 / 10", changeMessage: "Progress: %@" });
  assert.deepEqual(pass.secondaryFields.map((field) => field.label), ["Program", "Tier", "Member"]);
  assert.deepEqual(pass.banner, { kind: "stamps", filled: 3, total: 10, emoji: "✨", customIconUrl: null });
  assert.deepEqual(pass.google.primary, { label: "Visits", value: "3 / 10" });
  assert.deepEqual(pass.google.secondary, { label: "Remaining", value: "7 visits" });
  // With a banner, Apple's big primary field stays empty (it would sit on the picture).
  assert.deepEqual(view.applePrimaryFields(pass), []);
});

test("progress never shows more stamps than the card holds", () => {
  const pass = view.buildProgramPassView(stampProgram({ progress: 14 }));
  assert.equal(pass.header.value, "10 / 10");
  assert.equal(pass.banner.filled, 10);
});

test("no tier field unless the business runs tiers", () => {
  const pass = view.buildProgramPassView(stampProgram());
  assert.deepEqual(pass.secondaryFields.map((field) => field.label), ["Program", "Member"]);
});

test("a membership counts down and never carries a tier", () => {
  const pass = view.buildProgramPassView(
    stampProgram({ program: { name: "Glow Membership", isMembership: true, requiredStamps: 5 }, membership: { remaining: 4, total: 5 }, tierName: "Gold" }),
  );
  assert.deepEqual(pass.header, { label: "Membership", value: "Glow Membership" });
  assert.deepEqual(pass.secondaryFields.map((field) => [field.label, field.value]), [["Visits left", "4 of 5"], ["Member", "Mina Hanna"]]);
  assert.equal(pass.banner.filled, 4);
  assert.deepEqual(pass.google.secondary, { label: "Status", value: "Active" });
});

test("a photo replaces the stamps only when there is a photo", () => {
  const withPhoto = view.buildProgramPassView(stampProgram({ program: { walletHeroStyle: "PHOTO", photoUrl: "https://cdn.example/p.jpg" } }));
  assert.deepEqual(withPhoto.banner, { kind: "photo", url: "https://cdn.example/p.jpg" });
  const noPhoto = view.buildProgramPassView(stampProgram({ program: { walletHeroStyle: "PHOTO", photoUrl: null } }));
  assert.equal(noPhoto.banner.kind, "stamps");
});

test("the pass colour is the shared wallet colour for the design, and each choice differs", () => {
  const seen = new Set();
  for (const choice of view.walletColourChoices) {
    const design = view.walletPreviewDesign(choice.layoutStyle, "STAR");
    const pass = view.buildProgramPassView(stampProgram({ program: { cardDesign: design } }));
    const expected = themes.resolveWalletCardColors({ branding, cardDesign: design });
    assert.equal(pass.colors.background, expected.background, choice.label);
    // The program (layoutStyle) and cashback (cardTheme) forms show the same swatch.
    assert.equal(pass.colors.background, view.walletPassColors({ cardTheme: choice.cardTheme, branding }).background, choice.label);
    seen.add(pass.colors.background);
  }
  assert.equal(seen.size, view.walletColourChoices.length, "every colour choice paints a different card");
});

test("Brand colour is the brand primary colour, even when white text would not read on it", () => {
  const sky = { ...branding, primaryColor: "#87CEEB", secondaryColor: "#E0F2FE" };
  const pass = view.buildProgramPassView(stampProgram({ branding: sky, program: { cardDesign: view.walletPreviewDesign("CLASSIC", "STAR") } }));
  assert.equal(pass.colors.background, "#87CEEB");
  assert.equal(pass.colors.foreground, "#111827", "dark text on a light brand colour");
});

test("a legacy MINIMAL design reads as Brand colour", () => {
  assert.equal(view.walletColourLayoutStyle("MINIMAL"), "CLASSIC");
});

test("the cashback card: balance under the photo, or big when there is no photo", () => {
  const base = { businessName: "The Skin Lab", logoUrl: null, branding, customerName: "Mina Hanna", balance: "AED 25.00" };
  const plain = view.buildCashbackPassView({ ...base, cashback: { name: "Glow Cashback" } });
  assert.deepEqual(plain.header, { label: "Program", value: "Glow Cashback" });
  assert.deepEqual(plain.secondaryFields.map((field) => field.label), ["Member"]);
  assert.equal(plain.banner, null);
  assert.deepEqual(view.applePrimaryFields(plain), [{ label: "Balance", value: "AED 25.00", changeMessage: "Balance: %@" }]);

  const photo = view.buildCashbackPassView({ ...base, cashback: { photoUrl: "https://cdn.example/c.jpg" } });
  assert.equal(photo.title, "Cashback");
  assert.deepEqual(photo.secondaryFields.map((field) => field.label), ["Member", "Balance"]);
  assert.deepEqual(view.applePrimaryFields(photo), []);
  assert.equal(photo.barcodeAltText, "Show at checkout");
});

test("the Apple and Google passes are built from this view", () => {
  const apple = read("src/lib/walletwallet/mapper.ts");
  assert.match(apple, /const view = buildProgramPassView\(/);
  assert.match(apple, /const view = buildCashbackPassView\(/);
  assert.match(apple, /headerFields: \[view\.header\]/);
  assert.match(apple, /secondaryFields: view\.secondaryFields/);
  assert.match(apple, /primaryFields: applePrimaryFields\(view\)/);
  assert.match(apple, /const color = hexColor\(view\.colors\.background\)/);
  // Tier rides on a stamp card only, when the business runs tiers.
  assert.match(apple, /tierName: !isMembership && business\.tierSetting/);

  const google = read("src/lib/google-wallet/mapper.ts");
  assert.match(google, /const view = buildProgramPassView\(/);
  assert.match(google, /stampImagePath\(program\.uuid, view\.banner\.filled, view\.banner\.total, view\.banner\.emoji, view\.banner\.customIconUrl\)/);
  assert.match(google, /loyaltyPoints: \{ label: view\.google\.primary\.label/);
  assert.match(google, /hexBackgroundColor: walletColors\.background/);
});

test("the web card and every preview render the same view", () => {
  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /const primaryPassView = primaryProgram\s*\? buildProgramPassView\(/);
  assert.match(page, /<WalletPassCard view=\{primaryPassView\} platform=\{passPlatform\} qrCode=\{primaryProgram\.qrCode\} \/>/);
  for (const form of ["src/components/ProgramDesignStudioForm.tsx", "src/components/ProgramCreateWizard.tsx"]) {
    assert.match(read(form), /buildProgramPassView\(/, form);
    assert.match(read(form), /<WalletPassPreview/, form);
  }
  const cashback = read("src/components/CashbackSetupForm.tsx");
  assert.match(cashback, /buildCashbackPassView\(/);
  assert.match(cashback, /<WalletPassPreview view=\{previewView\} \/>/);
  // The stamp picture on the web is drawn by the same function as the wallet PNG.
  assert.match(read("src/components/wallet-pass/WalletPassCard.tsx"), /drawStampStripSvg\(banner\.filled, banner\.total, iconHref\)/);
  assert.match(read("src/lib/wallet/stamp-image.ts"), /sharp\(Buffer\.from\(drawStampStripSvg\(earned, total, customIconHref \?\? stampIconDataUrl\(emoji\)\)\)\)/);
});
