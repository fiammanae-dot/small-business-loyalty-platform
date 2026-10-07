-- Apple Wallet passes issued through WalletWallet. One row per customer-program
-- membership, storing the WalletWallet serial so later loyalty changes can push
-- a live pass update. Additive and nullable, so the running app is unaffected
-- until WALLETWALLET_API_KEY is set.
CREATE TYPE "AppleWalletSyncStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'REVOKED');

CREATE TABLE "apple_wallet_passes" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "customer_program_membership_id" INTEGER NOT NULL,
    "serial_number" TEXT,
    "share_url" TEXT,
    "status" "AppleWalletSyncStatus" NOT NULL DEFAULT 'PENDING',
    "last_synced_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "apple_wallet_passes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "apple_wallet_passes_customer_program_membership_id_key" ON "apple_wallet_passes"("customer_program_membership_id");
CREATE UNIQUE INDEX "apple_wallet_passes_serial_number_key" ON "apple_wallet_passes"("serial_number");
CREATE INDEX "apple_wallet_passes_business_id_idx" ON "apple_wallet_passes"("business_id");
CREATE INDEX "apple_wallet_passes_status_idx" ON "apple_wallet_passes"("status");

ALTER TABLE "apple_wallet_passes" ADD CONSTRAINT "apple_wallet_passes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "apple_wallet_passes" ADD CONSTRAINT "apple_wallet_passes_customer_program_membership_id_fkey" FOREIGN KEY ("customer_program_membership_id") REFERENCES "customer_program_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
