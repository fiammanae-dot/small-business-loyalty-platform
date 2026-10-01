-- Phase 4: cashback wallet (Feature 2). A per-customer AED store-credit balance
-- with a full ledger of top-ups, spends and reversals. Additive only: one new
-- defaulted column on business_customer_memberships, one enum, and one table.
-- Existing customers start at a 0 balance and are unaffected.

-- AlterTable
ALTER TABLE "business_customer_memberships"
    ADD COLUMN "cashback_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "CashbackTransactionType" AS ENUM ('EARN', 'SPEND', 'REVERSAL');

-- CreateTable
CREATE TABLE "cashback_transactions" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "business_customer_membership_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "type" "CashbackTransactionType" NOT NULL,
    "bill_amount" DECIMAL(12,2),
    "rate_percent" DECIMAL(5,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "note" TEXT,
    "issued_by_user_id" INTEGER,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashback_transactions_uuid_key" ON "cashback_transactions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_transactions_idempotency_key_key" ON "cashback_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "cashback_transactions_business_id_idx" ON "cashback_transactions"("business_id");

-- CreateIndex
CREATE INDEX "cashback_transactions_business_customer_membership_id_idx" ON "cashback_transactions"("business_customer_membership_id");

-- CreateIndex
CREATE INDEX "cashback_transactions_business_customer_membership_id_created_idx" ON "cashback_transactions"("business_customer_membership_id", "created_at");

-- CreateIndex
CREATE INDEX "cashback_transactions_branch_id_idx" ON "cashback_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "cashback_transactions_issued_by_user_id_idx" ON "cashback_transactions"("issued_by_user_id");

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_business_customer_membership_id_fkey" FOREIGN KEY ("business_customer_membership_id") REFERENCES "business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
