DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingCycle') THEN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
  END IF;
END $$;

ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "monthly_price" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "annual_price" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "billing_cycle_support" JSONB;

ALTER TABLE "business_subscriptions"
  ADD COLUMN IF NOT EXISTS "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'YEARLY';

UPDATE "subscription_plans"
SET
  "code" = 'STARTER',
  "name" = 'Starter',
  "monthly_price" = 100.00,
  "annual_price" = 1000.00,
  "max_branches" = 1,
  "max_loyalty_programs" = 1,
  "billing_cycle_support" = '["MONTHLY","YEARLY"]'::jsonb
WHERE "name" = 'Starter' OR "code" = 'STARTER';

INSERT INTO "subscription_plans" (
  "code",
  "name",
  "monthly_price",
  "annual_price",
  "max_branches",
  "max_loyalty_programs",
  "billing_cycle_support",
  "created_at",
  "updated_at"
)
SELECT 'STARTER', 'Starter', 100.00, 1000.00, 1, 1, '["MONTHLY","YEARLY"]'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "code" = 'STARTER' OR "name" = 'Starter');

UPDATE "subscription_plans"
SET
  "code" = 'GROWTH',
  "name" = 'Growth',
  "monthly_price" = 200.00,
  "annual_price" = 2000.00,
  "max_branches" = 3,
  "max_loyalty_programs" = 5,
  "billing_cycle_support" = '["MONTHLY","YEARLY"]'::jsonb
WHERE "name" = 'Growth' OR "code" = 'GROWTH';

INSERT INTO "subscription_plans" (
  "code",
  "name",
  "monthly_price",
  "annual_price",
  "max_branches",
  "max_loyalty_programs",
  "billing_cycle_support",
  "created_at",
  "updated_at"
)
SELECT 'GROWTH', 'Growth', 200.00, 2000.00, 3, 5, '["MONTHLY","YEARLY"]'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "code" = 'GROWTH' OR "name" = 'Growth');

UPDATE "subscription_plans"
SET
  "code" = 'MULTI_BRANCH',
  "name" = 'Multi Branch',
  "monthly_price" = 0.00,
  "annual_price" = 1000.00,
  "max_branches" = 10,
  "max_loyalty_programs" = 15,
  "billing_cycle_support" = '["YEARLY"]'::jsonb
WHERE "name" IN ('Multi-Branch', 'Multi Branch') OR "code" = 'MULTI_BRANCH';

INSERT INTO "subscription_plans" (
  "code",
  "name",
  "monthly_price",
  "annual_price",
  "max_branches",
  "max_loyalty_programs",
  "billing_cycle_support",
  "created_at",
  "updated_at"
)
SELECT 'MULTI_BRANCH', 'Multi Branch', 0.00, 1000.00, 10, 15, '["YEARLY"]'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "code" = 'MULTI_BRANCH' OR "name" IN ('Multi-Branch', 'Multi Branch'));

UPDATE "business_subscriptions"
SET "subscription_plan_id" = (SELECT "id" FROM "subscription_plans" WHERE "code" = 'MULTI_BRANCH' LIMIT 1)
WHERE "subscription_plan_id" IN (SELECT "id" FROM "subscription_plans" WHERE "name" = 'Premium' OR "code" = 'PREMIUM');

UPDATE "business_subscriptions" bs
SET "billing_cycle" = 'YEARLY'
FROM "subscription_plans" sp
WHERE bs."subscription_plan_id" = sp."id"
  AND sp."code" = 'MULTI_BRANCH';

DELETE FROM "subscription_plans"
WHERE COALESCE("code", '') NOT IN ('STARTER', 'GROWTH', 'MULTI_BRANCH')
  AND "id" NOT IN (SELECT DISTINCT "subscription_plan_id" FROM "business_subscriptions");

ALTER TABLE "subscription_plans"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "monthly_price" SET NOT NULL,
  ALTER COLUMN "annual_price" SET NOT NULL,
  ALTER COLUMN "billing_cycle_support" SET NOT NULL;

ALTER TABLE "subscription_plans"
  DROP COLUMN IF EXISTS "features",
  DROP COLUMN IF EXISTS "price_monthly";

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");

ALTER TABLE "subscription_plans"
  ADD CONSTRAINT "subscription_plans_monthly_price_min_check" CHECK ("monthly_price" >= 0),
  ADD CONSTRAINT "subscription_plans_annual_price_min_check" CHECK ("annual_price" >= 0);
