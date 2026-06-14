CREATE TABLE "public"."failed_login_audit" (
  "id" SERIAL NOT NULL,
  "email_attempted" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "user_agent" TEXT,
  "outcome" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "failed_login_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "failed_login_audit_email_attempted_created_at_idx"
ON "public"."failed_login_audit"("email_attempted", "created_at");

CREATE INDEX "failed_login_audit_ip_address_created_at_idx"
ON "public"."failed_login_audit"("ip_address", "created_at");

CREATE INDEX "failed_login_audit_outcome_created_at_idx"
ON "public"."failed_login_audit"("outcome", "created_at");

ALTER TABLE "public"."stamp_transactions"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "stamp_transactions_idempotency_key_key"
ON "public"."stamp_transactions"("idempotency_key");

ALTER TABLE "public"."reward_redemptions"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "reward_redemptions_idempotency_key_key"
ON "public"."reward_redemptions"("idempotency_key");
