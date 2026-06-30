import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("program-level Design Studio stores card design safely", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0038_program_card_design_json/migration.sql");
  const actions = read("src/app/dashboard/programs/actions.ts");

  assert.match(schema, /cardDesign\s+Json\?\s+@map\("card_design"\)/);
  assert.match(migration, /ADD COLUMN "card_design" JSONB/);
  assert.match(actions, /updateProgramDesignStudioAction/);
  assert.match(actions, /validateActionSecurity\(formData, "dashboard:program-design-studio"/);
  assert.match(actions, /where: \{ uuid, businessId: user\.businessId \}/);
  assert.match(actions, /cardDesign: cardDesign as unknown as Prisma\.InputJsonValue/);
  assert.match(actions, /cardTheme: getCardThemeForDesignStudioTemplate\(parsed\.data\.layoutStyle\)/);
  assert.match(actions, /PROGRAM_DESIGN_UPDATED/);
});

test("Business Owner program detail links to the Design Studio route", () => {
  const detail = read("src/app/dashboard/programs/[id]/page.tsx");
  const designPage = read("src/app/dashboard/programs/[id]/design-studio/page.tsx");

  assert.match(detail, /\/design-studio/);
  assert.match(detail, /Design Studio/);
  assert.match(detail, /Open Design Studio/);
  assert.match(detail, /SectionCard title="Design Studio"/);
  assert.match(detail, /Customize this program's customer-facing loyalty card design/);
  assert.match(designPage, /getBusinessOwnerContext/);
  assert.match(designPage, /where: \{ uuid: id, businessId: user\.businessId \}/);
  assert.match(designPage, /ProgramDesignStudioForm/);
  assert.match(designPage, /createCsrfToken\("dashboard:program-design-studio"\)/);
});

test("Design Studio navigation stays Business Owner-only", () => {
  const branchProgram = read("src/app/branch/programs/[id]/page.tsx");
  const staffPrograms = read("src/app/staff/programs/page.tsx");

  assert.doesNotMatch(branchProgram, /design-studio|Design Studio/);
  assert.doesNotMatch(staffPrograms, /design-studio|Design Studio/);
});

test("Design Studio MVP exposes only approved controls and live preview", () => {
  const helper = read("src/lib/design-studio.ts");
  const form = read("src/components/ProgramDesignStudioForm.tsx");

  assert.match(helper, /designStudioTemplateOptions/);
  assert.match(helper, /CLASSIC/);
  assert.match(helper, /MODERN/);
  assert.match(helper, /PREMIUM/);
  assert.match(helper, /LUXURY/);
  assert.match(helper, /designStudioStampJourneyOptions/);
  assert.match(helper, /CIRCLES/);
  assert.match(helper, /CONNECTED_DOTS/);
  assert.match(helper, /PROGRESS_BAR/);
  assert.match(helper, /getAllowedStampIconsForBusinessType/);
  assert.match(form, /Live Preview/);
  assert.match(form, /LoyaltyWalletCard/);
  assert.match(form, /name="layoutStyle"/);
  assert.match(form, /name="stampJourneyStyle"/);
  assert.match(form, /name="stampIcon"/);
  assert.doesNotMatch(form, /\b(upload|marketplace|artificial intelligence|drag-and-drop)\b/i);
});

test("public card reads saved program card design with fallback behavior", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");

  assert.match(publicCard, /resolveCardDesign\(programMembership\.loyaltyProgram\.cardDesign\)/);
  assert.match(publicCard, /resolveCardDesign\(primaryProgram\?\.programMembership\.loyaltyProgram\.cardDesign\)/);
  assert.match(publicCard, /cardDesign,/);
  assert.match(publicCard, /cardTheme: primaryProgram\?\.programMembership\.loyaltyProgram\.cardTheme \?\? null/);
});
