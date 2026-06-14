-- CreateEnum
CREATE TYPE "public"."ScanStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."ScanEventResult" AS ENUM ('VALID', 'INVALID', 'WRONG_BUSINESS', 'DISABLED');

-- Add scan token fields
ALTER TABLE "public"."customer_program_memberships"
ADD COLUMN "scan_token" TEXT,
ADD COLUMN "scan_status" "public"."ScanStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "scan_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "scan_last_used_at" TIMESTAMP(3);

-- Backfill existing memberships with secure random scan tokens.
UPDATE "public"."customer_program_memberships"
SET "scan_token" = 'scan_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "scan_token" IS NULL;

ALTER TABLE "public"."customer_program_memberships"
ALTER COLUMN "scan_token" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."scan_events" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "scanned_by_user_id" INTEGER,
    "customer_program_membership_id" INTEGER,
    "scan_token" TEXT NOT NULL,
    "result" "public"."ScanEventResult" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_program_memberships_scan_token_key" ON "public"."customer_program_memberships"("scan_token" ASC);

-- CreateIndex
CREATE INDEX "scan_events_business_id_idx" ON "public"."scan_events"("business_id" ASC);

-- CreateIndex
CREATE INDEX "scan_events_branch_id_idx" ON "public"."scan_events"("branch_id" ASC);

-- CreateIndex
CREATE INDEX "scan_events_scanned_by_user_id_idx" ON "public"."scan_events"("scanned_by_user_id" ASC);

-- CreateIndex
CREATE INDEX "scan_events_customer_program_membership_id_idx" ON "public"."scan_events"("customer_program_membership_id" ASC);

-- CreateIndex
CREATE INDEX "scan_events_scan_token_idx" ON "public"."scan_events"("scan_token" ASC);

-- AddForeignKey
ALTER TABLE "public"."scan_events" ADD CONSTRAINT "scan_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scan_events" ADD CONSTRAINT "scan_events_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scan_events" ADD CONSTRAINT "scan_events_scanned_by_user_id_fkey" FOREIGN KEY ("scanned_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scan_events" ADD CONSTRAINT "scan_events_customer_program_membership_id_fkey" FOREIGN KEY ("customer_program_membership_id") REFERENCES "public"."customer_program_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
