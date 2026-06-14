-- CreateEnum
CREATE TYPE "public"."CardStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- Ensure token backfill can use secure UUID generation.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add nullable columns first so existing memberships can be backfilled safely.
ALTER TABLE "public"."business_customer_memberships"
  ADD COLUMN "card_token" TEXT,
  ADD COLUMN "card_status" "public"."CardStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "card_created_at" TIMESTAMP(3),
  ADD COLUMN "card_last_viewed_at" TIMESTAMP(3);

-- Backfill existing memberships with opaque public tokens.
UPDATE "public"."business_customer_memberships"
SET
  "card_token" = 'cst_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  "card_created_at" = COALESCE("created_at", CURRENT_TIMESTAMP)
WHERE "card_token" IS NULL;

ALTER TABLE "public"."business_customer_memberships"
  ALTER COLUMN "card_token" SET NOT NULL,
  ALTER COLUMN "card_created_at" SET NOT NULL,
  ALTER COLUMN "card_created_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "business_customer_memberships_card_token_key" ON "public"."business_customer_memberships"("card_token" ASC);
