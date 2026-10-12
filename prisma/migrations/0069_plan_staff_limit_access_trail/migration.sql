-- Plan limits and access trail, so one paid branch cannot quietly run more shops.
--
-- 1. Plans gain a staff limit (active Staff + Branch Manager logins; the owner
--    is not counted). Starter 3, Growth 10, Multi Branch 30; any other plan 3.
ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "max_staff" INTEGER NOT NULL DEFAULT 3;

UPDATE "subscription_plans" SET "max_staff" = 3 WHERE "code" = 'STARTER';
UPDATE "subscription_plans" SET "max_staff" = 10 WHERE "code" = 'GROWTH';
UPDATE "subscription_plans" SET "max_staff" = 30 WHERE "code" = 'MULTI_BRANCH';

-- 2. Every scan records the device (a long-lived browser id), its network and
--    the city its IP maps to. Existing rows stay empty.
ALTER TABLE "scan_events"
  ADD COLUMN IF NOT EXISTS "device_id" TEXT,
  ADD COLUMN IF NOT EXISTS "ip_address" TEXT,
  ADD COLUMN IF NOT EXISTS "user_agent" TEXT,
  ADD COLUMN IF NOT EXISTS "ip_city" TEXT,
  ADD COLUMN IF NOT EXISTS "ip_country" TEXT,
  ADD COLUMN IF NOT EXISTS "ip_latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "ip_longitude" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "scan_events_business_id_device_id_idx" ON "scan_events"("business_id", "device_id");

-- 3. Every successful sign-in is recorded the same way.
CREATE TABLE IF NOT EXISTS "login_events" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "business_id" INTEGER,
  "branch_id" INTEGER,
  "device_id" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "ip_city" TEXT,
  "ip_country" TEXT,
  "ip_latitude" DOUBLE PRECISION,
  "ip_longitude" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_events_user_id_created_at_idx" ON "login_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "login_events_business_id_created_at_idx" ON "login_events"("business_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "login_events"
    ADD CONSTRAINT "login_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
