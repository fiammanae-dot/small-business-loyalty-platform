-- Additive and backward compatible: every new user column is nullable or has a
-- default, so existing rows and the currently deployed application keep working
-- unchanged until the 2FA code ships. No downtime, no backfill required.

-- AlterTable: TOTP two-factor fields on users
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN "two_factor_activated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "last_totp_step" INTEGER;

-- CreateTable: single-use TOTP recovery codes (hash only, never plaintext)
CREATE TABLE "two_factor_backup_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_backup_codes_user_id_code_hash_key" ON "two_factor_backup_codes"("user_id", "code_hash");

-- CreateIndex
CREATE INDEX "two_factor_backup_codes_user_id_used_at_idx" ON "two_factor_backup_codes"("user_id", "used_at");

-- AddForeignKey
ALTER TABLE "two_factor_backup_codes" ADD CONSTRAINT "two_factor_backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
