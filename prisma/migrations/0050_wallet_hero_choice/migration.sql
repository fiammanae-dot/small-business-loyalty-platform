-- Google Wallet gives an issuer one picture slot. A business now chooses what
-- goes in it: the stamps (the default, and what every existing program keeps)
-- or a photo of their own.
CREATE TYPE "WalletHeroStyle" AS ENUM ('STAMPS', 'PHOTO');

ALTER TABLE "loyalty_programs"
  ADD COLUMN "wallet_hero_style" "WalletHeroStyle" NOT NULL DEFAULT 'STAMPS',
  ADD COLUMN "wallet_photo_url" TEXT;
