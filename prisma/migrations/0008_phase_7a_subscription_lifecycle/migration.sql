-- Create commercial subscription lifecycle enum.
ALTER TYPE "public"."SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

ALTER TABLE "public"."business_subscriptions"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."business_subscriptions"
  ALTER COLUMN "status" TYPE "public"."SubscriptionStatus"
  USING (
    CASE "status"::text
      WHEN 'TRIALING' THEN 'TRIAL'
      WHEN 'INACTIVE' THEN 'SUSPENDED'
      WHEN 'PAST_DUE' THEN 'EXPIRED'
      WHEN 'CANCELED' THEN 'CANCELLED'
      ELSE "status"::text
    END
  )::"public"."SubscriptionStatus";

ALTER TABLE "public"."business_subscriptions"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "public"."SubscriptionStatus_old";

CREATE TYPE "public"."SubscriptionAuditAction" AS ENUM (
  'PLAN_CHANGED',
  'STATUS_CHANGED',
  'TRIAL_ACTIVATED',
  'TRIAL_EXPIRED',
  'SUBSCRIPTION_EXTENDED'
);

ALTER TABLE "public"."business_subscriptions"
  ADD COLUMN "trial_start_date" TIMESTAMP(3),
  ADD COLUMN "trial_end_date" TIMESTAMP(3),
  ADD COLUMN "expiry_date" TIMESTAMP(3),
  ADD COLUMN "renewal_date" TIMESTAMP(3);

UPDATE "public"."business_subscriptions"
SET
  "expiry_date" = COALESCE("end_date", "start_date" + INTERVAL '1 year'),
  "renewal_date" = COALESCE("end_date", "start_date" + INTERVAL '1 year')
WHERE "expiry_date" IS NULL;

CREATE TABLE "public"."subscription_audit_logs" (
  "id" SERIAL NOT NULL,
  "business_id" INTEGER NOT NULL,
  "business_subscription_id" INTEGER NOT NULL,
  "user_id" INTEGER,
  "action" "public"."SubscriptionAuditAction" NOT NULL,
  "previous_value" TEXT,
  "new_value" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_subscriptions_status_idx" ON "public"."business_subscriptions"("status");
CREATE INDEX "business_subscriptions_expiry_date_idx" ON "public"."business_subscriptions"("expiry_date");
CREATE INDEX "subscription_audit_logs_business_id_idx" ON "public"."subscription_audit_logs"("business_id");
CREATE INDEX "subscription_audit_logs_business_subscription_id_idx" ON "public"."subscription_audit_logs"("business_subscription_id");
CREATE INDEX "subscription_audit_logs_user_id_idx" ON "public"."subscription_audit_logs"("user_id");
CREATE INDEX "subscription_audit_logs_action_idx" ON "public"."subscription_audit_logs"("action");

ALTER TABLE "public"."subscription_audit_logs"
  ADD CONSTRAINT "subscription_audit_logs_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."subscription_audit_logs"
  ADD CONSTRAINT "subscription_audit_logs_business_subscription_id_fkey"
  FOREIGN KEY ("business_subscription_id") REFERENCES "public"."business_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."subscription_audit_logs"
  ADD CONSTRAINT "subscription_audit_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
