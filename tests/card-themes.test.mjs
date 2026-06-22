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

test("program create and edit flows expose visual card theme previews", () => {
  const themes = read("src/lib/card-themes.ts");
  const form = read("src/components/ProgramForm.tsx");
  const programs = read("src/lib/programs.ts");
  const actions = read("src/app/dashboard/programs/actions.ts");
  const editPage = read("src/app/dashboard/programs/[id]/edit/page.tsx");

  assert.match(themes, /cardThemeOptions/);
  assert.match(themes, /Coffee & Cafe/);
  assert.match(themes, /Restaurant/);
  assert.match(themes, /Beauty & Salon/);
  assert.match(themes, /Automotive/);
  assert.match(themes, /Retail & General/);
  assert.match(form, /Loyalty card theme/);
  assert.match(form, /type="radio" name="cardTheme"/);
  assert.match(form, /cardThemeOptions\.map/);
  assert.match(programs, /cardTheme: z\.enum/);
  assert.match(actions, /cardTheme: getString\(formData, "cardTheme"\) \|\| "BUSINESS_DEFAULT"/);
  assert.match(actions, /cardTheme: parsed\.data\.cardTheme/);
  assert.match(editPage, /cardTheme: program\.cardTheme/);
});

test("public customer card renders selected program theme without replacing core card sections", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");

  assert.match(publicCard, /resolveCardThemeColors/);
  assert.match(publicCard, /primaryCardTheme/);
  assert.match(publicCard, /cardTheme\.label/);
  assert.match(publicCard, /LoyaltyProgressSection/);
  assert.match(publicCard, /RewardStatusSection/);
  assert.match(publicCard, /TierStatusSection/);
  assert.match(publicCard, /ReferralCardSection/);
  assert.match(publicCard, /WalletPlaceholderSection/);
  assert.match(publicCard, /getScanQrDataUrl/);
});
