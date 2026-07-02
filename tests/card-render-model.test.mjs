import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("card render model centralizes future Design Studio rendering inputs", () => {
  const model = read("src/lib/card-render-model.ts");
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "export type CardRenderModel",
    "export type CardRenderModelInput",
    "buildCardRenderModel",
    "layoutStyle",
    "cardStyle",
    "stampJourneyStyle",
    "stampIcon",
    "progressStyle",
    "typographyPreset",
    "backgroundStyle",
    "backgroundPattern",
    "background",
    "decorationStyle",
    "rewardStyle",
    "footerStyle",
    "animationStyle",
    "templateId",
    "sectionVisibility",
    "visibleSections",
    "resolvedColors",
    "typography",
    "progress",
    "business",
    "customer",
    "reward",
    "qr",
  ]) {
    assert.match(model, new RegExp(expected));
  }

  assert.doesNotMatch(schema, /CardRenderModel|card_render_model|visibleSections|visible_sections/);
});

test("card render model preserves existing fallback display behavior", () => {
  const model = read("src/lib/card-render-model.ts");

  assert.match(model, /const hasProgram = Boolean\(input\.program && input\.program\.required > 0\)/);
  assert.match(model, /const required = hasProgram \? Math\.max\(input\.program\?\.required \?\? 1, 1\) : 1/);
  assert.match(model, /const statusText = hasProgram \? \(rewardReady \? "Reward Ready" : remainingText\) : "No active program yet"/);
  assert.match(model, /displayProgram = input\.program\?\.name \|\| "Loyalty Card"/);
  assert.match(model, /displayReward = input\.program\?\.rewardName \|\| "Loyalty reward"/);
  assert.match(model, /helperText: input\.qr\.helperText \|\| \(hasProgram \? "Scan this card" : "Show this QR code to staff to find your customer card\."\)/);
});

test("public card passes render model design into wallet card renderers", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");

  assert.match(publicCard, /buildCardRenderModel/);
  assert.match(publicCard, /const primaryCardModel = buildCardRenderModel/);
  assert.match(publicCard, /theme: primaryCardModel\.resolvedColors/);
  assert.match(publicCard, /programName: primaryCardModel\.reward\.programName/);
  assert.match(publicCard, /required: primaryCardModel\.progress\.hasProgram \? primaryCardModel\.progress\.required : 0/);
  assert.match(publicCard, /cardDesign: primaryCardModel\.design/);
  assert.match(wallet, /design\.visibleSections/);
  assert.match(frontExport, /resolveCardDesign\(wallet\.cardDesign\)/);
  assert.match(frontExport, /LoyaltyWalletCard/);
  assert.doesNotMatch(frontExport, /displayCompletion|progressTrack|displayProgress/);
  assert.match(backExport, /resolveCardDesign\(wallet\.cardDesign\)/);
  assert.doesNotMatch(preview, /CardRenderModel|buildCardRenderModel/);
});
