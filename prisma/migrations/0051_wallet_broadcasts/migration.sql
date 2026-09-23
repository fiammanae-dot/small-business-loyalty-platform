-- Owner-sent Google Wallet broadcasts: history plus the per-business cooldown.
--
-- Additive only: two new enums and one new table. No existing column changes,
-- no backfill. APPLE_WALLET is reserved for the Apple Wallet integration.

-- CreateEnum
CREATE TYPE "WalletBroadcastChannel" AS ENUM ('GOOGLE_WALLET', 'APPLE_WALLET');

-- CreateEnum
CREATE TYPE "WalletBroadcastStatus" AS ENUM ('SENT', 'PARTIAL', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "wallet_broadcasts" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "loyalty_program_id" INTEGER,
    "channel" "WalletBroadcastChannel" NOT NULL DEFAULT 'GOOGLE_WALLET',
    "header" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "WalletBroadcastStatus" NOT NULL,
    "programs_reached" INTEGER NOT NULL DEFAULT 0,
    "programs_skipped" INTEGER NOT NULL DEFAULT 0,
    "programs_failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "sent_by_user_id" INTEGER,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_broadcasts_uuid_key" ON "wallet_broadcasts"("uuid");

-- CreateIndex: history list and cooldown lookup are both "latest for this business".
CREATE INDEX "wallet_broadcasts_business_id_sent_at_idx" ON "wallet_broadcasts"("business_id", "sent_at");

-- AddForeignKey
ALTER TABLE "wallet_broadcasts" ADD CONSTRAINT "wallet_broadcasts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_broadcasts" ADD CONSTRAINT "wallet_broadcasts_loyalty_program_id_fkey" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_broadcasts" ADD CONSTRAINT "wallet_broadcasts_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
