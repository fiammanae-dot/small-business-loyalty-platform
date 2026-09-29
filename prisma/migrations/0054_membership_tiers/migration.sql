-- Membership tiers (Feature 1): a loyalty program can be a paid membership tier
-- with a price, a perks list, and a menu of included treatments. Additive only:
-- three new nullable/defaulted columns and one new table. Existing programs keep
-- is_membership = false and behave exactly as before.

-- AlterTable
ALTER TABLE "loyalty_programs"
    ADD COLUMN "is_membership" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "price_amount" DECIMAL(10,2),
    ADD COLUMN "membership_benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "membership_treatments" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "loyalty_program_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_treatments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_treatments_uuid_key" ON "membership_treatments"("uuid");

-- CreateIndex
CREATE INDEX "membership_treatments_loyalty_program_id_idx" ON "membership_treatments"("loyalty_program_id");

-- AddForeignKey
ALTER TABLE "membership_treatments" ADD CONSTRAINT "membership_treatments_loyalty_program_id_fkey" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
