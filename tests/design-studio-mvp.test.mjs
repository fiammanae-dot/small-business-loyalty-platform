import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("program-level Design Studio stores card design safely", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0038_program_card_design_json/migration.sql");
  const presetMigration = read("prisma/migrations/0039_business_design_presets/migration.sql");
  const actions = read("src/app/dashboard/programs/actions.ts");

  assert.match(schema, /cardDesign\s+Json\?\s+@map\("card_design"\)/);
  assert.match(schema, /model BusinessDesignPreset/);
  assert.match(schema, /@@unique\(\[businessId, name\]\)/);
  assert.match(migration, /ADD COLUMN "card_design" JSONB/);
  assert.match(presetMigration, /CREATE TABLE "business_design_presets"/);
  assert.match(presetMigration, /"business_id" INTEGER NOT NULL/);
  assert.match(presetMigration, /"card_design" JSONB NOT NULL/);
  assert.match(actions, /updateProgramDesignStudioAction/);
  assert.match(actions, /saveBusinessDesignPresetAction/);
  assert.match(actions, /renameBusinessDesignPresetAction/);
  assert.match(actions, /deleteBusinessDesignPresetAction/);
  assert.match(actions, /validateActionSecurity\(formData, "dashboard:program-design-studio"/);
  assert.match(actions, /where: \{ uuid, businessId: user\.businessId \}/);
  assert.match(actions, /cardDesign: cardDesign as unknown as Prisma\.InputJsonValue/);
  assert.match(actions, /cardTheme: getCardThemeForDesignStudioTemplate\(parsed\.data\.layoutStyle\)/);
  assert.match(actions, /PROGRAM_DESIGN_UPDATED/);
});

test("new program creation includes the create-time Design Studio wizard", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");
  const newPage = read("src/app/dashboard/programs/new/page.tsx");
  const wizard = read("src/components/ProgramCreateWizard.tsx");

  assert.match(newPage, /ProgramCreateWizard/);
  assert.match(wizard, /WizardProgress/);
  assert.match(wizard, /Program Setup/);
  assert.match(wizard, /Design Studio/);
  assert.match(wizard, /Live Preview/);
  // A wallet pass can show a colour and a stamp icon - that is the design.
  assert.match(wizard, /name="layoutStyle"/);
  assert.match(wizard, /name="stampIcon"/);
  assert.match(wizard, /<CardColourPicker /);
  assert.match(wizard, /<StampIconChooser /);
  for (const removed of ["stampJourneyStyle", "rewardStyle", "typographyPreset", "backgroundStyle", "decorationStyle", "visibleSections", "Professional Templates"]) {
    assert.doesNotMatch(wizard, new RegExp(removed), `the create wizard no longer offers ${removed}`);
  }
  assert.match(actions, /parseDesignStudioForm\(formData, businessType\)/);
  assert.match(actions, /cardDesign: cardDesign as unknown as Prisma\.InputJsonValue/);
  assert.match(actions, /redirect\(`\/dashboard\/programs\/\$\{program\.uuid\}\?success=Program created with card design\.`\)/);
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
  assert.match(designPage, /sourcePrograms = await prisma\.loyaltyProgram\.findMany/);
  assert.match(designPage, /where: \{ businessId: user\.businessId, uuid: \{ not: program\.uuid \} \}/);
  assert.match(designPage, /ProgramDesignStudioForm/);
  assert.match(designPage, /createCsrfToken\("dashboard:program-design-studio"\)/);
});

test("Design Studio navigation stays Business Owner-only", () => {
  const branchProgram = read("src/app/branch/programs/[id]/page.tsx");
  const staffPrograms = read("src/app/staff/programs/page.tsx");

  assert.doesNotMatch(branchProgram, /design-studio|Design Studio/);
  assert.doesNotMatch(staffPrograms, /design-studio|Design Studio/);
});

test("Design Studio offers only what a wallet pass can show", () => {
  const helper = read("src/lib/design-studio.ts");
  const form = read("src/components/ProgramDesignStudioForm.tsx");
  const page = read("src/app/dashboard/programs/[id]/design-studio/page.tsx");

  // The saved design is a colour and a stamp icon; everything else is fixed.
  assert.match(helper, /designStudioSchema = z\.object\(\{\s*layoutStyle: z\.enum\(\["CLASSIC", "MODERN", "PREMIUM", "LUXURY"\]\),\s*stampIcon: z\.enum\(stampIcons\),\s*\}\)/);
  assert.match(helper, /export const walletCanonicalDesign = \{/);
  assert.match(helper, /\.\.\.walletCanonicalDesign,/);

  assert.match(form, /name="layoutStyle"/);
  assert.match(form, /name="stampIcon"/);
  assert.match(form, /title="Card colour"/);
  assert.match(form, /title="Stamp icon"/);
  assert.match(form, /<WalletPassPreview view=\{view\} cardRef=\{previewRef\} \/>/);
  for (const removed of ["Background", "Typography", "Reward Progress", "Reward Box", "Card Layout", "Professional Templates", "stampJourneyStyle", "typographyPreset", "decorationStyle", "visibleSections", "Undo", "Zoom"]) {
    assert.doesNotMatch(form, new RegExp(removed), `Design Studio no longer offers ${removed}`);
  }
  // Presets and copying a design from another program still work.
  assert.match(form, /formAction=\{savePresetAction\}/);
  assert.match(form, /formAction=\{renamePresetAction\}/);
  assert.match(form, /formAction=\{deletePresetAction\}/);
  assert.match(page, /const sourceDesign = resolveCardDesign\(asCardDesignInput\(sourceProgram\.cardDesign\)\)/);
  assert.match(page, /select: \{\s*uuid: true,\s*name: true,\s*cardDesign: true,\s*\}/);
  assert.doesNotMatch(page, /About Apple &amp; Google Wallet passes/);
});

test("public card reads saved program card design with fallback behavior", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const actions = read("src/app/dashboard/programs/actions.ts");

  assert.match(publicCard, /export const dynamic = "force-dynamic"/);
  assert.match(publicCard, /export const revalidate = 0/);
  assert.match(publicCard, /programMembership\.loyaltyProgram\.cardDesign as CardDesignInput/);
  assert.match(publicCard, /cardDesign,/);
  assert.match(publicCard, /cardDesign: primaryCardModel\.design/);
  assert.match(publicCard, /cardTheme: primaryProgram\?\.programMembership\.loyaltyProgram\.cardTheme \?\? null/);
  assert.match(actions, /cardDesign: cardDesign as unknown as Prisma\.InputJsonValue/);
  assert.match(actions, /revalidatePath\("\/dashboard\/customers"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/customers\/\[id\]", "page"\)/);
  assert.match(actions, /revalidatePath\("\/card\/\[token\]", "page"\)/);
  assert.doesNotMatch(actions, /businessCustomerMembership\.updateMany|customerProgramMembership\.updateMany/);
});


