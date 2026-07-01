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

test("new program creation guides Business Owners to Design Studio", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");
  const newPage = read("src/app/dashboard/programs/new/page.tsx");

  assert.match(newPage, /showCardThemeSelector=\{false\}/);
  assert.match(actions, /redirect\(`\/dashboard\/programs\/\$\{program\.uuid\}\/design-studio\?success=Program created\. Customize this card in Design Studio\.`\)/);
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

test("Design Studio MVP exposes only approved controls and live preview", () => {
  const helper = read("src/lib/design-studio.ts");
  const form = read("src/components/ProgramDesignStudioForm.tsx");
  const page = read("src/app/dashboard/programs/[id]/design-studio/page.tsx");

  assert.match(helper, /designStudioTemplateOptions/);
  assert.match(helper, /designStudioProfessionalPresetGroups/);
  assert.match(helper, /designStudioProfessionalPresets/);
  assert.match(helper, /DesignStudioProfessionalPreset/);
  assert.match(helper, /getDefaultAssetsForIndustry/);
  for (const label of ["Barbershop", "Beauty Salon", "Car Wash", "Café", "Restaurant", "General"]) {
    assert.match(helper, new RegExp(label));
  }
  for (const label of ["Modern Barber", "Luxury Barber", "Vintage Barber", "Classic Barber", "Rose Gold", "Luxury Beauty", "Elegant Spa", "Minimal Studio", "Warm Espresso", "Modern Coffee", "Organic Café", "Dark Roast", "Fine Dining", "Casual Kitchen", "Street Food", "Chef's Choice", "Aqua Clean", "Bubble Wash", "Premium Detailing", "Express Wash", "Modern Business", "Professional"]) {
    assert.match(helper, new RegExp(label));
  }
  assert.match(helper, /CLASSIC/);
  assert.match(helper, /MODERN/);
  assert.match(helper, /PREMIUM/);
  assert.match(helper, /LUXURY/);
  assert.match(helper, /Balanced design suitable for any business\./);
  assert.match(helper, /Clean layout with generous spacing and a contemporary feel\./);
  assert.match(helper, /High-contrast style that stands out and feels professional\./);
  assert.match(helper, /Elegant dark treatment with refined visual emphasis\./);
  assert.match(helper, /designStudioStampJourneyOptions/);
  assert.match(helper, /CIRCLES/);
  assert.match(helper, /CONNECTED_DOTS/);
  assert.match(helper, /PROGRESS_BAR/);
  assert.match(helper, /designStudioBackgroundStyleOptions/);
  assert.match(helper, /designStudioBackgroundPatternOptions/);
  assert.match(helper, /designStudioRewardStyleOptions/);
  assert.match(helper, /designStudioTypographyOptions/);
  assert.match(helper, /designStudioCardFinishOptions/);
  assert.match(helper, /designStudioCardContentOptions/);
  for (const label of ["Solid", "Gradient", "Pattern", "Subtle Dots", "Diagonal Lines", "Waves", "Coffee Beans", "Scissors", "Water Bubbles", "Food Pattern", "Beauty Pattern"]) {
    assert.match(helper, new RegExp(label));
  }
  for (const label of ["Filled", "Outline", "Glass", "Premium", "Ticket"]) {
    assert.match(helper, new RegExp(label));
  }
  for (const label of ["Modern", "Classic", "Premium", "Luxury", "Playful", "Minimal"]) {
    assert.match(helper, new RegExp(label));
  }
  for (const label of ["Flat", "Soft", "Glass", "Premium", "Luxury"]) {
    assert.match(helper, new RegExp(label));
  }
  for (const label of ["Business Logo", "Business Name", "Program Name", "Customer Name", "Tier Badge", "Reward Box", "Reward Progress", "Visits Remaining", "QR Code", "Footer Message", "Referral Section"]) {
    assert.match(helper, new RegExp(label));
  }
  assert.match(helper, /getAllowedStampIconsForBusinessType/);
  assert.match(page, /Design Your Loyalty Card/);
  assert.match(page, /Customize the appearance of your customer's digital loyalty card\./);
  assert.match(page, /Preview on Phone/);
  assert.match(form, /Card Style/);
  assert.match(form, /Professional Templates/);
  assert.match(form, /Professional Template/);
  assert.match(form, /Build From Scratch/);
  assert.match(form, /Duplicate Existing Design/);
  assert.match(form, /My Business Presets/);
  assert.match(form, /Duplicate From Another Program/);
  assert.match(form, /Copy a design from one of your existing loyalty programs\./);
  assert.match(form, /Save Current Design/);
  assert.match(form, /Apply Preset/);
  assert.match(form, /Rename preset/);
  assert.match(form, /Delete/);
  assert.match(form, /Choose a business type, then browse professional starting points\./);
  assert.match(form, /professionalPresetCategoryOptions/);
  assert.match(form, /professionalPresetSearch/);
  assert.match(form, /filteredProfessionalPresets/);
  assert.match(form, /Search Templates/);
  assert.match(form, /Search templates by name or business/);
  assert.match(form, /Clear/);
  assert.match(form, /Business Category/);
  assert.match(form, /getDefaultProfessionalPresetCategory/);
  assert.match(form, /Showing \{selectedProfessionalCategoryLabel\} Templates/);
  assert.match(form, /Use Template/);
  assert.match(form, /Choose Another Template/);
  assert.match(form, /No templates found/);
  assert.match(form, /Clear search/);
  assert.match(form, /No templates found for this category/);
  assert.match(form, /applyProfessionalPreset/);
  assert.match(form, /applyBusinessPreset/);
  assert.match(form, /applySourceProgramDesign/);
  assert.match(form, /copiedSourceProgramUuid/);
  assert.match(form, /Design copied into the preview/);
  assert.match(form, /Review the manual builder below, then click Save Design/);
  assert.match(form, /Design only/);
  assert.match(form, /Applied to Preview/);
  assert.match(form, /Apply Design/);
  assert.match(form, /sourceProgramToThumbnailPreset/);
  assert.match(form, /designSummary/);
  assert.match(form, /commitDesignChange\(presetToDesignSnapshot\(preset\)\)/);
  assert.match(form, /commitDesignChange\(preset\.cardDesign\)/);
  assert.match(form, /commitDesignChange\(sourceProgram\.cardDesign\)/);
  assert.match(form, /aria-pressed=\{active\}/);
  assert.match(form, /PresetThumbnail/);
  assert.match(form, /Choose the overall personality of your loyalty card\./);
  assert.match(form, /TemplateThumbnail/);
  assert.match(form, /Selected/);
  assert.match(form, /sr-only/);
  assert.match(form, /Reward Progress/);
  assert.match(form, /Stamp Design/);
  assert.match(form, /Background/);
  assert.match(form, /Choose the background feeling for this loyalty card\./);
  assert.match(form, /backgroundStyle: option\.value/);
  assert.match(form, /backgroundPattern: option\.value/);
  assert.match(form, /name="backgroundStyle"/);
  assert.match(form, /name="backgroundPattern"/);
  assert.match(form, /Reward Box/);
  assert.match(form, /Choose how rewards are presented to your customers\./);
  assert.match(form, /RewardStyleThumbnail/);
  assert.match(form, /rewardStyle: option\.value/);
  assert.match(form, /name="rewardStyle"/);
  assert.match(form, /Typography/);
  assert.match(form, /Choose the personality of your loyalty card\./);
  assert.match(form, /TypographyThumbnail/);
  assert.match(form, /typographyPreset: option\.value/);
  assert.match(form, /name="typographyPreset"/);
  assert.match(form, /typographyPreviewStyles/);
  assert.match(form, /Card Finish/);
  assert.match(form, /Choose the visual finish that best matches your brand\./);
  assert.match(form, /CardFinishPreviewFrame/);
  assert.match(form, /CardFinishThumbnail/);
  assert.match(form, /decorationStyle: option\.value/);
  assert.match(form, /name="decorationStyle"/);
  assert.match(form, /cardFinishStyles/);
  assert.match(form, /Card Content/);
  assert.match(form, /Choose what your customers see on their loyalty card\./);
  assert.match(form, /VisibleCardPreview/);
  assert.match(form, /stampJourneyStyle=\{stampJourneyStyle\}/);
  assert.match(form, /stampIcon=\{stampIcon\}/);
  assert.match(form, /rewardStyle=\{rewardStyle\}/);
  assert.match(form, /typographyPreset=\{typographyPreset\}/);
  assert.match(form, /backgroundStyle=\{backgroundStyle\}/);
  assert.match(form, /backgroundPattern=\{backgroundPattern\}/);
  assert.match(form, /PreviewProgress/);
  assert.match(form, /StampIconGraphic stampIcon=\{stampIcon\}/);
  assert.match(form, /StampIconGraphic stampIcon=\{option\.value\}/);
  assert.match(form, /StampIconGraphic stampIcon=\{preset\.stampIcon\}/);
  assert.match(form, /rewardBoxStyles\[rewardStyle\]/);
  assert.match(form, /liveTypographyStyles\[typographyPreset\]/);
  assert.match(form, /getLivePreviewBackground\(theme\.cardBackground, backgroundStyle, backgroundPattern\)/);
  assert.match(form, /liveBackgroundPatterns/);
  assert.match(form, /visibleSections: \{/);
  assert.match(form, /visibleSections\.\$\{option\.value\}/);
  assert.match(form, /Customer Preview/);
  assert.match(form, /Live Preview/);
  assert.match(form, /Last updated just now/);
  assert.match(form, /previewContextOptions/);
  assert.match(form, /previewContextFooter/);
  assert.match(form, /PreviewContextFrame/);
  assert.match(form, /Preview Context/);
  assert.match(form, /designHistoryPast/);
  assert.match(form, /designHistoryFuture/);
  assert.match(form, /commitDesignChange/);
  assert.match(form, /undoDesignChange/);
  assert.match(form, /redoDesignChange/);
  assert.match(form, /cloneDesignSnapshot/);
  assert.match(form, /designSnapshotsMatch/);
  assert.match(form, /isEditableKeyboardTarget/);
  assert.match(form, /Undo last design change/);
  assert.match(form, /Redo design change/);
  assert.match(form, /Ctrl\/Cmd\+Z/);
  assert.match(form, /Ctrl\/Cmd\+Shift\+Z or Ctrl\/Cmd\+Y/);
  assert.match(form, /Phone/);
  assert.match(form, /Apple Wallet/);
  assert.match(form, /Google Wallet/);
  assert.match(form, /previewZoomOptions/);
  assert.match(form, /previewZoomScales/);
  assert.match(form, /Zoom out/);
  assert.match(form, /Zoom in/);
  assert.match(form, /iPhone Preview/);
  assert.match(form, /Preview updates live as you edit/);
  assert.match(form, /Previewing your loyalty card on a customer's phone/);
  assert.match(form, /Previewing your loyalty card inside Apple Wallet/);
  assert.match(form, /Previewing your loyalty card inside Google Wallet/);
  assert.match(form, /toPng/);
  assert.match(form, /previewExportRef/);
  assert.match(form, /Preview Actions/);
  assert.match(form, /Download PNG/);
  assert.match(form, /Download PDF/);
  assert.match(form, /Copy Preview Link/);
  assert.match(form, /buildPreviewPdfHtml/);
  assert.match(form, /navigator\.clipboard\.writeText/);
  assert.match(form, /design-studio\?preview=true/);
  assert.match(form, /PNG downloaded/);
  assert.match(form, /PDF opened for download/);
  assert.match(form, /Link copied/);
  assert.match(form, /Design Summary/);
  assert.match(form, /Card Style: \$\{selectedStyleLabel\}/);
  assert.match(form, /Typography: \$\{selectedTypographyLabel\}/);
  assert.match(form, /Reward Progress: \$\{selectedJourneyLabel\}/);
  assert.match(form, /Stamp Design: \$\{selectedStampIconLabel\}/);
  assert.match(form, /Background: \$\{selectedBackgroundLabel\}/);
  assert.match(form, /Finish: \$\{selectedFinishLabel\}/);
  assert.match(form, /Visibility: \$\{visibleSectionCount\}/);
  assert.match(form, /7 \/ 10 Visits/);
  assert.match(form, /3 visits until reward/);
  assert.match(form, /Card Status/);
  assert.match(form, /PreviewChip/);
  assert.doesNotMatch(form, /Typography Preview/);
  assert.match(form, /stampIconComponents/);
  for (const icon of ["Scissors", "Coffee", "Car", "Droplets", "Utensils", "Brush", "Gift"]) {
    assert.match(form, new RegExp(icon));
  }
  assert.doesNotMatch(form, /getStampIconMark|stampIconMarks/);
  assert.match(form, /lg:grid-cols-\[minmax\(0,70fr\)_minmax\(300px,30fr\)\]/);
  assert.match(form, /order-first[\s\S]*lg:order-last/);
  assert.match(form, /lg:sticky lg:top-6/);
  assert.doesNotMatch(form, /sticky bottom-3/);
  assert.doesNotMatch(form, /LoyaltyWalletCard/);
  assert.match(form, /name="layoutStyle"/);
  assert.match(form, /name="stampJourneyStyle"/);
  assert.match(form, /name="stampIcon"/);
  assert.match(page, /where: \{ businessId: user\.businessId, uuid: \{ not: program\.uuid \} \}/);
  assert.match(page, /const sourceDesign = resolveCardDesign\(sourceProgram\.cardDesign\)/);
  assert.match(page, /select: \{\s*uuid: true,\s*name: true,\s*cardDesign: true,\s*\}/);
  assert.doesNotMatch(form, /title="Card Template"/);
  assert.doesNotMatch(form, /title="Stamp Journey"/);
  assert.doesNotMatch(form, /title="Stamp Icon"/);
  assert.doesNotMatch(form, /\b(upload|marketplace|artificial intelligence|drag-and-drop)\b/i);
});

test("public card reads saved program card design with fallback behavior", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");

  assert.match(publicCard, /resolveCardDesign\(programMembership\.loyaltyProgram\.cardDesign\)/);
  assert.match(publicCard, /resolveCardDesign\(primaryProgram\?\.programMembership\.loyaltyProgram\.cardDesign\)/);
  assert.match(publicCard, /cardDesign,/);
  assert.match(publicCard, /cardTheme: primaryProgram\?\.programMembership\.loyaltyProgram\.cardTheme \?\? null/);
});



