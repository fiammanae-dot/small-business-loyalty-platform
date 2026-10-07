-- Per-customer Apple Wallet passes for business-wide features (cashback, tier),
-- separate from the per-program apple_wallet_passes. One row per customer per
-- kind. Additive and nullable, so the running app is unaffected until the
-- feature cards are switched on.
CREATE TYPE "AppleWalletFeatureKind" AS ENUM ('CASHBACK', 'TIER');

CREATE TABLE "apple_wallet_feature_passes" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "business_customer_membership_id" INTEGER NOT NULL,
    "kind" "AppleWalletFeatureKind" NOT NULL,
    "serial_number" TEXT,
    "share_url" TEXT,
    "status" "AppleWalletSyncStatus" NOT NULL DEFAULT 'PENDING',
    "last_synced_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "apple_wallet_feature_passes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "apple_wallet_feature_passes_business_customer_membership_id_kind_key" ON "apple_wallet_feature_passes"("business_customer_membership_id", "kind");
CREATE UNIQUE INDEX "apple_wallet_feature_passes_serial_number_key" ON "apple_wallet_feature_passes"("serial_number");
CREATE INDEX "apple_wallet_feature_passes_business_id_idx" ON "apple_wallet_feature_passes"("business_id");
CREATE INDEX "apple_wallet_feature_passes_status_idx" ON "apple_wallet_feature_passes"("status");

ALTER TABLE "apple_wallet_feature_passes" ADD CONSTRAINT "apple_wallet_feature_passes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "apple_wallet_feature_passes" ADD CONSTRAINT "apple_wallet_feature_passes_business_customer_membership_id_fkey" FOREIGN KEY ("business_customer_membership_id") REFERENCES "business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
