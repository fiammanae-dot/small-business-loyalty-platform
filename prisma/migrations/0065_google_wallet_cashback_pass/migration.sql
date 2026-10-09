-- Cashback card for Google Wallet (Android): one per customer, mirroring the
-- Apple CASHBACK feature pass. Additive only.
CREATE TABLE "google_wallet_cashback_passes" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "business_customer_membership_id" INTEGER NOT NULL,
    "class_id" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "status" "GoogleWalletSyncStatus" NOT NULL DEFAULT 'PENDING',
    "save_url_last_generated_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_wallet_cashback_passes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_wallet_cashback_passes_business_customer_membership_id_key"
    ON "google_wallet_cashback_passes"("business_customer_membership_id");
CREATE UNIQUE INDEX "google_wallet_cashback_passes_object_id_key"
    ON "google_wallet_cashback_passes"("object_id");
CREATE INDEX "google_wallet_cashback_passes_business_id_idx"
    ON "google_wallet_cashback_passes"("business_id");
CREATE INDEX "google_wallet_cashback_passes_status_idx"
    ON "google_wallet_cashback_passes"("status");

ALTER TABLE "google_wallet_cashback_passes"
    ADD CONSTRAINT "google_wallet_cashback_passes_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_wallet_cashback_passes"
    ADD CONSTRAINT "google_wallet_cashback_passes_business_customer_membership_id_fkey"
    FOREIGN KEY ("business_customer_membership_id") REFERENCES "business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
