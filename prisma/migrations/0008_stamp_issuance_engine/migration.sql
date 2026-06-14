-- CreateEnum
CREATE TYPE "public"."StampTransactionSource" AS ENUM ('QR_SCAN');

-- CreateEnum
CREATE TYPE "public"."ActivityAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."ActivityAlertStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "public"."stamp_transactions" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "customer_program_membership_id" INTEGER NOT NULL,
    "issued_by_user_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "source" "public"."StampTransactionSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stamp_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stamp_transactions_quantity_check" CHECK ("quantity" >= 1 AND "quantity" <= 5)
);

-- CreateTable
CREATE TABLE "public"."activity_alerts" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "user_id" INTEGER,
    "customer_program_membership_id" INTEGER,
    "alert_type" TEXT NOT NULL,
    "severity" "public"."ActivityAlertSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."ActivityAlertStatus" NOT NULL DEFAULT 'OPEN',
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,

    CONSTRAINT "activity_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stamp_transactions_business_id_idx" ON "public"."stamp_transactions"("business_id" ASC);

-- CreateIndex
CREATE INDEX "stamp_transactions_branch_id_idx" ON "public"."stamp_transactions"("branch_id" ASC);

-- CreateIndex
CREATE INDEX "stamp_transactions_customer_program_membership_id_idx" ON "public"."stamp_transactions"("customer_program_membership_id" ASC);

-- CreateIndex
CREATE INDEX "stamp_transactions_customer_program_membership_id_created_at_idx" ON "public"."stamp_transactions"("customer_program_membership_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "stamp_transactions_issued_by_user_id_idx" ON "public"."stamp_transactions"("issued_by_user_id" ASC);

-- CreateIndex
CREATE INDEX "stamp_transactions_issued_by_user_id_created_at_idx" ON "public"."stamp_transactions"("issued_by_user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "stamp_transactions_business_id_created_at_idx" ON "public"."stamp_transactions"("business_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "activity_alerts_business_id_idx" ON "public"."activity_alerts"("business_id" ASC);

-- CreateIndex
CREATE INDEX "activity_alerts_business_id_status_severity_created_at_idx" ON "public"."activity_alerts"("business_id" ASC, "status" ASC, "severity" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "activity_alerts_branch_id_idx" ON "public"."activity_alerts"("branch_id" ASC);

-- CreateIndex
CREATE INDEX "activity_alerts_user_id_idx" ON "public"."activity_alerts"("user_id" ASC);

-- CreateIndex
CREATE INDEX "activity_alerts_customer_program_membership_id_idx" ON "public"."activity_alerts"("customer_program_membership_id" ASC);

-- CreateIndex
CREATE INDEX "activity_alerts_reviewed_by_idx" ON "public"."activity_alerts"("reviewed_by" ASC);

-- AddForeignKey
ALTER TABLE "public"."stamp_transactions" ADD CONSTRAINT "stamp_transactions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stamp_transactions" ADD CONSTRAINT "stamp_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stamp_transactions" ADD CONSTRAINT "stamp_transactions_customer_program_membership_id_fkey" FOREIGN KEY ("customer_program_membership_id") REFERENCES "public"."customer_program_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stamp_transactions" ADD CONSTRAINT "stamp_transactions_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_alerts" ADD CONSTRAINT "activity_alerts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_alerts" ADD CONSTRAINT "activity_alerts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_alerts" ADD CONSTRAINT "activity_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_alerts" ADD CONSTRAINT "activity_alerts_customer_program_membership_id_fkey" FOREIGN KEY ("customer_program_membership_id") REFERENCES "public"."customer_program_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_alerts" ADD CONSTRAINT "activity_alerts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
