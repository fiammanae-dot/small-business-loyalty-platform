-- Give cashback a program-style identity: its own name and card design
-- (theme, hero image, design JSON), mirroring loyalty_programs so cashback can
-- be presented as a real program instead of a bare settings toggle.
-- All columns are additive and nullable/defaulted, so existing cashback
-- settings keep working unchanged until the designer is used.
ALTER TABLE "business_cashback_settings"
    ADD COLUMN "name" TEXT,
    ADD COLUMN "card_theme" "CardTheme" NOT NULL DEFAULT 'BUSINESS_DEFAULT',
    ADD COLUMN "wallet_hero_style" "WalletHeroStyle" NOT NULL DEFAULT 'PHOTO',
    ADD COLUMN "wallet_photo_url" TEXT,
    ADD COLUMN "card_design" JSONB;
