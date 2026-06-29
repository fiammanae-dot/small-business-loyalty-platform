import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

const themeValues = [
  "BUSINESS_DEFAULT",
  "COFFEE_CAFE",
  "RESTAURANT",
  "BEAUTY_SALON",
  "AUTOMOTIVE",
  "RETAIL_GENERAL",
];

test("loyalty programs store a selected card theme with business default support", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0029_loyalty_program_card_themes/migration.sql");

  assert.match(schema, /enum CardTheme/);
  assert.match(schema, /cardTheme\s+CardTheme\s+@default\(BUSINESS_DEFAULT\)\s+@map\("card_theme"\)/);
  assert.match(migration, /CREATE TYPE "public"\."CardTheme" AS ENUM/);
  assert.match(migration, /ADD COLUMN "card_theme" "public"\."CardTheme" NOT NULL DEFAULT 'BUSINESS_DEFAULT'/);
  for (const value of themeValues) {
    assert.match(schema, new RegExp(value));
    assert.match(migration, new RegExp(value));
  }
});

test("program create and edit flows expose independent wallet visual style previews", () => {
  const themes = read("src/lib/card-themes.ts");
  const form = read("src/components/ProgramForm.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");
  const programs = read("src/lib/programs.ts");
  const actions = read("src/app/dashboard/programs/actions.ts");
  const editPage = read("src/app/dashboard/programs/[id]/edit/page.tsx");
  const newPage = read("src/app/dashboard/programs/new/page.tsx");

  assert.match(themes, /walletStyleTokens/);
  assert.match(themes, /modern-clean/);
  assert.match(themes, /premium-dark/);
  assert.match(themes, /minimal-light/);
  assert.match(themes, /image-background/);
  assert.match(themes, /Business Default/);
  assert.match(themes, /Uses your business brand colors with the Modern Clean wallet style/);
  assert.match(form, /CardThemePreviewSelector/);
  assert.match(form, /businessName={businessName}/);
  assert.match(form, /branding={branding}/);
  assert.match(form, /Wallet Card Style/);
  assert.match(form, /Business category and wallet style are separate/);
  assert.match(preview, /Wallet card style/);
  assert.match(preview, /Choose one of four wallet styles/);
  assert.match(preview, /aria-label=.*wallet card style/);
  assert.match(preview, /View card style/);
  assert.match(preview, /type="button"/);
  assert.match(preview, /role="dialog"/);
  assert.match(preview, /aria-modal="true"/);
  assert.match(preview, /LoyaltyWalletCard/);
  assert.match(preview, /programName="Coffee Club"/);
  assert.match(preview, /rewardName="Free Coffee"/);
  assert.match(preview, /This card style uses illustrative card content/);
  assert.match(preview, /cardThemeOptions\.map/);
  assert.match(programs, /cardTheme: z\.enum/);
  assert.match(actions, /cardTheme: getString\(formData, "cardTheme"\) \|\| "BUSINESS_DEFAULT"/);
  assert.match(actions, /cardTheme: parsed\.data\.cardTheme/);
  assert.match(editPage, /cardTheme: program\.cardTheme/);
  assert.match(editPage, /businessName=\{business.name\}/);
  assert.match(newPage, /businessName=\{business.name\}/);
  assert.match(newPage, /resolveBranding\(business.branding\)/);
});

test("program forms use the business-level business type without a per-program selector", () => {
  const form = read("src/components/ProgramForm.tsx");
  const actions = read("src/app/dashboard/programs/actions.ts");
  const editPage = read("src/app/dashboard/programs/[id]/edit/page.tsx");
  const newPage = read("src/app/dashboard/programs/new/page.tsx");

  assert.doesNotMatch(form, /Business Type/);
  assert.doesNotMatch(form, /businessTypeOptions/);
  assert.doesNotMatch(form, /name="businessType"/);
  assert.match(form, /programTemplates\[defaults\.businessType\]/);

  assert.match(actions, /getBusinessTypeForProgramAction/);
  assert.match(actions, /select: \{ businessType: true \}/);
  assert.match(actions, /const parsed = programData\(formData, businessType\)/);
  assert.doesNotMatch(actions, /getString\(formData, "businessType"\)/);

  assert.match(newPage, /defaults=\{\{ businessType: business\.businessType/);
  assert.match(editPage, /businessType: business\.businessType/);
  assert.doesNotMatch(editPage, /businessType: program\.businessType/);
});

test("public customer card renders selected program theme through shared wallet components", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const walletCard = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const tierPanel = read("src/components/public-card/TierStatusPanel.tsx");
  const referralPanel = read("src/components/public-card/ReferralPanel.tsx");
  const walletShell = read("src/components/public-card/WalletCardShell.tsx");
  const themes = read("src/lib/card-themes.ts");

  assert.match(publicCard, /resolveCardThemeColors/);
  assert.match(publicCard, /primaryCardTheme/);
  assert.match(publicCard, /LoyaltyWalletCard/);
  assert.match(publicCard, /TierStatusPanel/);
  assert.match(publicCard, /ReferralPanel/);
  assert.match(publicCard, /ProgramRewardCard/);
  assert.match(publicCard, /getScanQrDataUrl/);
  assert.match(publicCard, /programName: primaryProgram\?\.programMembership\.loyaltyProgram\.name/);
  assert.match(publicCard, /rewardName: primaryProgram\?\.programMembership\.loyaltyProgram\.rewardName/);
  assert.match(walletShell, /phoneBackground/);
  assert.match(walletShell, /phoneRadius/);
  assert.match(walletShell, /phoneShadow/);
  assert.match(walletCard, /useState<"wallet" \| "scan">/);
  assert.match(walletCard, /WalletView/);
  assert.match(walletCard, /ScanView/);
  assert.match(walletCard, /Scan at Checkout/);
  assert.match(walletCard, /Present this QR at checkout/);
  assert.match(walletCard, /showScanView = !exportMode && mode === "scan"/);
  assert.match(walletCard, /Member Since/);
  assert.match(walletCard, /h-\[220px\] w-\[220px\]/);
  assert.match(walletCard, /h-\[12px\]/);
  assert.match(walletCard, /Next reward/);
  assert.match(walletCard, /Reward Ready/);
  assert.match(themes, /linear-gradient\(180deg, #11383f 0%, #0b2025 100%\)/);
  assert.match(themes, /linear-gradient\(180deg, #1f1f20 0%, #121212 100%\)/);
  assert.match(themes, /cardBackground: "#FFFFFF"/);
  assert.match(themes, /#E9C18D/);
  assert.match(tierPanel, /Customer tier/);
  assert.match(referralPanel, /<details className="group">/);
  assert.doesNotMatch(publicCard, /style=\{\{ color: cardTheme\.accent \}\}/);
  assert.doesNotMatch(publicCard, /cardTheme\.label/);
  assert.doesNotMatch(publicCard, /RewardStatusSection/);
  assert.doesNotMatch(publicCard, /WalletPlaceholderSection/);
  assert.doesNotMatch(publicCard, /Add to Apple Wallet|Add to Google Wallet|Coming Soon/);
});


test("public customer card supports saving the loyalty card as a PNG image", () => {
  const packageJson = read("package.json");
  const publicCard = read("src/app/card/[token]/page.tsx");
  const saveButton = read("src/components/SaveCardImageButton.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const walletCard = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const walletShell = read("src/components/public-card/WalletCardShell.tsx");
  const themes = read("src/lib/card-themes.ts");

  assert.match(packageJson, /"html-to-image"/);
  assert.match(publicCard, /SaveCardImageButton/);
  assert.match(publicCard, /data-loyalty-card-front-export/);
  assert.match(publicCard, /data-loyalty-card-back-export/);
  assert.match(publicCard, /left-\[-10000px\]/);
  assert.match(publicCard, /LoyaltyCardFrontExport/);
  assert.match(publicCard, /LoyaltyCardBackExport/);
  assert.match(publicCard, /frontTargetSelector="\[data-loyalty-card-front-export\]"/);
  assert.match(publicCard, /backTargetSelector="\[data-loyalty-card-back-export\]"/);
  assert.match(saveButton, /toPng/);
  assert.match(saveButton, /pixelRatio/);
  assert.match(saveButton, /includeQueryParams: true/);
  assert.match(saveButton, /loyalty-card-/);
  assert.match(saveButton, /Download Front/);
  assert.match(saveButton, /Download Back/);
  assert.match(saveButton, /frontTargetSelector/);
  assert.match(saveButton, /backTargetSelector/);
  assert.match(saveButton, /loyalty-card-.*side/);
  assert.match(frontExport, /LoyaltyCardFrontExport/);
  assert.match(frontExport, /Scan at Checkout/);
  assert.match(backExport, /LoyaltyCardBackExport/);
  assert.match(backExport, /Present this QR at checkout/);
  assert.match(backExport, /h-\[214px\] w-\[214px\]/);
  assert.match(backExport, /backgroundImage: `url\("\$\{wallet\.qrCode\}"\)`/);
  assert.match(backExport, /border-b border-black\/5/);
  assert.doesNotMatch(frontExport, /shadow-(?:sm|md|lg|xl|2xl)|ring-1|blur-3xl|backdrop-blur/);
  assert.doesNotMatch(backExport, /shadow-(?:sm|md|lg|xl|2xl)|ring-1|blur-3xl|backdrop-blur/);
  assert.match(walletCard, /showScanView = !exportMode && mode === "scan"/);
  assert.match(walletCard, /Scan at Checkout/);
  assert.match(walletShell, /exportMode/);
  assert.match(walletShell, /boxShadow: exportMode \? "none" : theme\.phoneShadow/);
  assert.match(walletShell, /boxShadow: exportMode \? "none" : theme\.shadow/);
  assert.doesNotMatch(walletShell, /blur-3xl/);
  assert.match(themes, /modern-clean/);
  assert.match(themes, /premium-dark/);
  assert.match(themes, /minimal-light/);
  assert.match(themes, /image-background/);
});

test("wallet card header keeps business names readable beside the tier badge", () => {
  const walletCard = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");

  for (const source of [walletCard, frontExport]) {
    assert.match(source, /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
    assert.match(source, /WebkitLineClamp: 2/);
    assert.match(source, /title=\{[^}]*businessName[^}]*\}/);
    assert.match(source, /w-\[104px\] shrink-0 text-right/);
  }

  assert.doesNotMatch(walletCard, /<h1 className="truncate[^"]*">\{businessName\}<\/h1>/);
  assert.doesNotMatch(frontExport, /<h1 className="truncate[^"]*">\{wallet\.businessName\}<\/h1>/);
});

test("public card support panels align with the wallet card width", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");

  assert.match(publicCard, /max-w-\[360px\][^"]*rounded-\[34px\][^"]*bg-white/);
  assert.match(publicCard, /<div className="mx-auto w-full max-w-\[360px\]">\s*<TierStatusPanel/);
  assert.match(publicCard, /<div className="mx-auto w-full max-w-\[360px\]">\s*<ReferralPanel/);
  assert.match(publicCard, /<section className="mx-auto w-full max-w-\[360px\] rounded-\[28px\]/);
});
