CREATE TYPE "public"."CardTheme" AS ENUM (
  'BUSINESS_DEFAULT',
  'COFFEE_CAFE',
  'RESTAURANT',
  'BEAUTY_SALON',
  'AUTOMOTIVE',
  'RETAIL_GENERAL'
);

ALTER TABLE "public"."loyalty_programs"
  ADD COLUMN "card_theme" "public"."CardTheme" NOT NULL DEFAULT 'BUSINESS_DEFAULT';
