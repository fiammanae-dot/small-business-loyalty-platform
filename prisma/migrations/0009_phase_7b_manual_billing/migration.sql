CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');

CREATE TABLE "public"."invoices" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "subscription_id" INTEGER NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "invoice_date" TIMESTAMP(3) NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "created_by_user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."payments" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "invoice_id" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "payment_method" "public"."PaymentMethod" NOT NULL,
  "payment_reference" TEXT,
  "paid_at" TIMESTAMP(3) NOT NULL,
  "recorded_by_user_id" INTEGER NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."invoice_audit_logs" (
  "id" SERIAL NOT NULL,
  "invoice_id" INTEGER NOT NULL,
  "business_id" INTEGER NOT NULL,
  "user_id" INTEGER,
  "action" TEXT NOT NULL,
  "previous_status" "public"."InvoiceStatus",
  "new_status" "public"."InvoiceStatus",
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoice_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_uuid_key" ON "public"."invoices"("uuid");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "public"."invoices"("invoice_number");
CREATE INDEX "invoices_business_id_idx" ON "public"."invoices"("business_id");
CREATE INDEX "invoices_subscription_id_idx" ON "public"."invoices"("subscription_id");
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");
CREATE INDEX "invoices_due_date_idx" ON "public"."invoices"("due_date");
CREATE INDEX "invoices_created_by_user_id_idx" ON "public"."invoices"("created_by_user_id");

CREATE UNIQUE INDEX "payments_uuid_key" ON "public"."payments"("uuid");
CREATE INDEX "payments_business_id_idx" ON "public"."payments"("business_id");
CREATE INDEX "payments_invoice_id_idx" ON "public"."payments"("invoice_id");
CREATE INDEX "payments_recorded_by_user_id_idx" ON "public"."payments"("recorded_by_user_id");
CREATE INDEX "payments_paid_at_idx" ON "public"."payments"("paid_at");

CREATE INDEX "invoice_audit_logs_invoice_id_idx" ON "public"."invoice_audit_logs"("invoice_id");
CREATE INDEX "invoice_audit_logs_business_id_idx" ON "public"."invoice_audit_logs"("business_id");
CREATE INDEX "invoice_audit_logs_user_id_idx" ON "public"."invoice_audit_logs"("user_id");
CREATE INDEX "invoice_audit_logs_action_idx" ON "public"."invoice_audit_logs"("action");

ALTER TABLE "public"."invoices"
  ADD CONSTRAINT "invoices_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."invoices"
  ADD CONSTRAINT "invoices_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "public"."business_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."invoices"
  ADD CONSTRAINT "invoices_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_recorded_by_user_id_fkey"
  FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."invoice_audit_logs"
  ADD CONSTRAINT "invoice_audit_logs_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."invoice_audit_logs"
  ADD CONSTRAINT "invoice_audit_logs_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."invoice_audit_logs"
  ADD CONSTRAINT "invoice_audit_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
