-- Phase 4.2: capture the staff-entered invoice number on cashback EARN rows
-- as a reference for who was charged what. Nullable so historical rows and
-- SPEND rows (which have no invoice) are unaffected.
ALTER TABLE "cashback_transactions" ADD COLUMN "invoice_number" TEXT;
