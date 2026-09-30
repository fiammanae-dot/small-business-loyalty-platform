-- Phase 2: record which treatment each membership visit used.
ALTER TABLE "stamp_transactions" ADD COLUMN "membership_treatment_id" INTEGER;
ALTER TABLE "stamp_transactions" ADD COLUMN "treatment_name" TEXT;

CREATE INDEX "stamp_transactions_membership_treatment_id_idx" ON "stamp_transactions"("membership_treatment_id");

ALTER TABLE "stamp_transactions"
  ADD CONSTRAINT "stamp_transactions_membership_treatment_id_fkey"
  FOREIGN KEY ("membership_treatment_id") REFERENCES "membership_treatments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
