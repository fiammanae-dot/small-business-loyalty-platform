/**
 * Phase 1 of making cashback a real program: BusinessCashbackSettings gains a
 * program-style identity - a name and a card design (theme, hero, design JSON).
 * Additive + nullable/defaulted, and the save action persists them only when
 * the form actually sends them.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("schema adds card-design columns to BusinessCashbackSettings", () => {
  const schema = read("prisma/schema.prisma");
  const start = schema.indexOf("model BusinessCashbackSettings");
  const model = schema.slice(start, schema.indexOf("}", start));
  assert.match(model, /name\s+String\?/);
  assert.match(model, /cardTheme\s+CardTheme\s+@default\(BUSINESS_DEFAULT\)\s+@map\("card_theme"\)/);
  assert.match(model, /walletHeroStyle\s+WalletHeroStyle\s+@default\(PHOTO\)\s+@map\("wallet_hero_style"\)/);
  assert.match(model, /walletPhotoUrl\s+String\?\s+@map\("wallet_photo_url"\)/);
  assert.match(model, /cardDesign\s+Json\?\s+@map\("card_design"\)/);
});

test("migration 0062 adds the columns additively", () => {
  const file = "prisma/migrations/0062_cashback_card_design/migration.sql";
  assert.ok(existsSync(file), "migration 0062 exists");
  const sql = read(file);
  assert.match(sql, /ALTER TABLE "business_cashback_settings"/);
  assert.match(sql, /ADD COLUMN "name" TEXT/);
  assert.match(sql, /ADD COLUMN "card_theme" "CardTheme" NOT NULL DEFAULT 'BUSINESS_DEFAULT'/);
  assert.match(sql, /ADD COLUMN "wallet_hero_style" "WalletHeroStyle" NOT NULL DEFAULT 'PHOTO'/);
  assert.match(sql, /ADD COLUMN "wallet_photo_url" TEXT/);
  assert.match(sql, /ADD COLUMN "card_design" JSONB/);
});

test("saveCashbackSettingsAction persists the identity fields only when sent", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /if \(formData\.has\("name"\)\) optional\.name =/);
  assert.match(actions, /if \(formData\.has\("cardTheme"\)\)/);
  assert.match(actions, /if \(formData\.has\("walletHeroStyle"\)\)/);
  assert.match(actions, /if \(formData\.has\("walletPhotoUrl"\)\)/);
  assert.match(actions, /if \(formData\.has\("cardDesign"\)\)/);
  // spread into both create and update of the cashback upsert
  const spreads = actions.match(/\.\.\.optional,/g) ?? [];
  assert.ok(spreads.length >= 2, `expected ...optional in create and update, found ${spreads.length}`);
});
