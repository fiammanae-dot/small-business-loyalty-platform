CREATE TYPE "CustomerTierCriteria" AS ENUM ('VISITS_ONLY', 'SPEND_ONLY', 'VISITS_AND_SPEND');

CREATE TABLE "customer_tier_settings" (
  "id" SERIAL PRIMARY KEY,
  "business_id" INTEGER NOT NULL UNIQUE,
  "criteria" "CustomerTierCriteria" NOT NULL DEFAULT 'VISITS_ONLY',
  "premium_visits" INTEGER NOT NULL DEFAULT 10,
  "elite_visits" INTEGER NOT NULL DEFAULT 25,
  "royal_vip_visits" INTEGER NOT NULL DEFAULT 50,
  "premium_spend" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "elite_spend" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "royal_vip_spend" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_tier_settings_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "customer_tier_settings_business_id_idx" ON "customer_tier_settings"("business_id");

ALTER TABLE "customer_tier_settings"
  ADD CONSTRAINT "customer_tier_settings_thresholds_check"
  CHECK (
    "premium_visits" >= 0
    AND "elite_visits" >= "premium_visits"
    AND "royal_vip_visits" >= "elite_visits"
    AND "premium_spend" >= 0
    AND "elite_spend" >= "premium_spend"
    AND "royal_vip_spend" >= "elite_spend"
  );
