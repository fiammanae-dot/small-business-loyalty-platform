import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("stamp icon foundation defines future Design Studio icon categories without persistence", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const icon of [
    "STAR",
    "HEART",
    "CHECK",
    "CIRCLE",
    "DIAMOND",
    "GIFT",
    "SCISSORS",
    "RAZOR",
    "COMB",
    "BARBER_POLE",
    "COFFEE_CUP",
    "COFFEE_BEAN",
    "ESPRESSO",
    "PLATE",
    "BURGER",
    "PIZZA",
    "CHEF_HAT",
    "CAR",
    "WATER_DROP",
    "BUBBLES",
    "WHEEL",
    "LIPSTICK",
    "MIRROR",
    "MAKEUP_BRUSH",
    "NAIL_POLISH",
  ]) {
    assert.match(design, new RegExp(icon));
  }

  assert.match(design, /export const stampIcons/);
  assert.match(design, /export function resolveStampIcon/);
  assert.match(design, /stampIcon: "STAR"/);
  assert.match(design, /stampIcon: resolveStampIcon\(input\?\.stampIcon\)/);
  assert.doesNotMatch(schema, /stampIcon|stamp_icon|CardDesignStampIcon/);
});

test("stamp icon resolver keeps safe fallback behavior", () => {
  const design = read("src/lib/card-design.ts");

  assert.match(design, /if \(value === "default"\) \{\s*return "STAR";\s*\}/);
  assert.match(design, /return resolveValue\("stampIcon", value\)/);
});

test("industry packs include default stamp icons and recommended icon groups", () => {
  const design = read("src/lib/card-design.ts");

  assert.match(design, /BARBERSHOP:[\s\S]*?stampIcon: "SCISSORS"/);
  assert.match(design, /BEAUTY_SALON:[\s\S]*?stampIcon: "LIPSTICK"/);
  assert.match(design, /CAR_WASH:[\s\S]*?stampIcon: "WATER_DROP"/);
  assert.match(design, /CAFE:[\s\S]*?stampIcon: "COFFEE_CUP"/);
  assert.match(design, /RESTAURANT:[\s\S]*?stampIcon: "PLATE"/);
  assert.match(design, /industryRecommendedStampIcons/);
  assert.match(design, /getRecommendedStampIconsForIndustry/);
  assert.match(design, /getRecommendedStampIconsForBusinessType/);
});

test("saved stamp icons are applied to live customer card progress markers", () => {
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const stampIconGraphic = read("src/components/design-studio/StampIconGraphic.tsx");
  const designStudioForm = read("src/components/ProgramDesignStudioForm.tsx");
  const createWizard = read("src/components/ProgramCreateWizard.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");
  const publicCard = read("src/app/card/[token]/page.tsx");

  assert.match(publicCard, /cardDesign: primaryCardModel\.design/);
  assert.match(wallet, /StampSlot stampIcon=\{design\.stampIcon\} filled=\{filled\}/);
  assert.match(designStudioForm, /StampSlot key=\{index\} stampIcon=\{stampIcon\} filled=\{filled\}/);
  assert.match(createWizard, /StampSlot key=\{index\} stampIcon=\{icon\} filled=\{filled\}/);
  assert.match(stampIconGraphic, /mode\?: "selector" \| "customer"/);
  assert.match(stampIconGraphic, /export function StampSlot/);
  assert.match(stampIconGraphic, /rounded-full border border-\[#E5E7EB\] bg-white/);
  assert.match(stampIconGraphic, /filled \? "opacity-100" : "opacity-30 grayscale-\[25%\]"/);
  assert.match(stampIconGraphic, /premiumStampMarks/);
  assert.match(stampIconGraphic, /COFFEE_CUP/);
  assert.match(stampIconGraphic, /SCISSORS/);
  assert.match(stampIconGraphic, /WATER_DROP/);
  assert.match(frontExport, /resolveCardDesign\(wallet\.cardDesign\)/);
  assert.match(backExport, /resolveCardDesign\(wallet\.cardDesign\)/);
  assert.doesNotMatch(preview, /resolveStampIcon/);
});
