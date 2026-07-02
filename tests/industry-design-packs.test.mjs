import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("industry design packs define safe CardDesign presets without persistence", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const expected of [
    "IndustryDesignPackId",
    "industryDesignPacks",
    "BARBERSHOP",
    "BEAUTY_SALON",
    "CAR_WASH",
    "CAFE",
    "RESTAURANT",
    "GENERAL",
    "getIndustryDesignPack",
    "resolveIndustryCardDesign",
  ]) {
    assert.match(design, new RegExp(expected));
  }

  for (const field of [
    "layoutStyle",
    "cardStyle",
    "stampJourneyStyle",
    "stampIcon",
    "progressStyle",
    "typographyPreset",
    "backgroundStyle",
    "backgroundPattern",
    "decorationStyle",
    "rewardStyle",
    "footerStyle",
    "animationStyle",
    "templateId",
  ]) {
    assert.match(design, new RegExp(field));
  }

  assert.doesNotMatch(schema, /industryDesignPack|industry_design_pack|templateId/);
});

test("industry design packs map existing BusinessType values to future-facing pack ids", () => {
  const design = read("src/lib/card-design.ts");

  assert.match(design, /businessTypes: \["COFFEE_SHOP"\]/);
  assert.match(design, /businessTypes: \["CAR_CARE_CENTER"\]/);
  assert.match(design, /businessTypes: \["BARBERSHOP"\]/);
  assert.match(design, /businessTypes: \["BEAUTY_SALON"\]/);
  assert.match(design, /businessTypes: \["RESTAURANT"\]/);
  assert.match(design, /businessTypes: \["OTHER"\]/);
  assert.match(design, /return "GENERAL"/);
});

test("industry design packs are applied to live cards only through saved program design", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");
  const themes = read("src/lib/card-themes.ts");

  assert.doesNotMatch(publicCard, /resolveIndustryCardDesign|getIndustryDesignPack/);
  assert.doesNotMatch(preview, /resolveIndustryCardDesign|getIndustryDesignPack/);
  assert.match(themes, /cardDesign \? getCardThemeForCardDesign\(design\) : cardTheme/);
});

test("industry design packs provide new program defaults without changing existing programs", () => {
  const design = read("src/lib/card-design.ts");
  const newPage = read("src/app/dashboard/programs/new/page.tsx");
  const editPage = read("src/app/dashboard/programs/[id]/edit/page.tsx");
  const actions = read("src/app/dashboard/programs/actions.ts");
  const publicCard = read("src/app/card/[token]/page.tsx");

  assert.match(design, /getCardThemeForCardDesign/);
  assert.match(design, /getIndustryDefaultCardTheme/);
  assert.match(design, /cardDesign\.cardStyle === "modern-clean"\) return "COFFEE_CAFE"/);
  assert.match(design, /cardDesign\.cardStyle === "premium-dark"\) return "RESTAURANT"/);
  assert.match(design, /cardDesign\.cardStyle === "minimal-light"\) return "BEAUTY_SALON"/);
  assert.match(design, /cardDesign\.cardStyle === "image-background"\) return "AUTOMOTIVE"/);

  assert.match(newPage, /const defaultCardTheme = getIndustryDefaultCardTheme\(business\.businessType\)/);
  assert.match(newPage, /cardTheme: defaultCardTheme/);

  assert.match(actions, /programData\(formData, businessType, getIndustryDefaultCardTheme\(businessType\)\)/);
  assert.match(actions, /function programData\(formData: FormData, businessType: string, defaultCardTheme = "BUSINESS_DEFAULT"\)/);

  assert.match(editPage, /cardTheme: program\.cardTheme/);
  assert.doesNotMatch(editPage, /getIndustryDefaultCardTheme/);
  assert.doesNotMatch(publicCard, /getIndustryDefaultCardTheme|resolveIndustryCardDesign/);
});
