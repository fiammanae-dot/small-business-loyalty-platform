-- Per-business feature switches: clinic memberships (Feature 1) and the cashback
-- wallet (Feature 2). Additive only: two new tables, no changes to existing
-- columns and no backfill. Both features stay off until a business opts in, so
-- existing businesses are unaffected.

-- CreateTable
CREATE TABLE "business_membership_settings" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_membership_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_cashback_settings" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_cashback_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_membership_settings_business_id_key" ON "business_membership_settings"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_cashback_settings_business_id_key" ON "business_cashback_settings"("business_id");

-- AddForeignKey
ALTER TABLE "business_membership_settings" ADD CONSTRAINT "business_membership_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_cashback_settings" ADD CONSTRAINT "business_cashback_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
