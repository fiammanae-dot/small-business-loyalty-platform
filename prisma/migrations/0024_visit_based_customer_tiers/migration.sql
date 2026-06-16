CREATE TYPE "CustomerTierQualificationWindow" AS ENUM ('LIFETIME', 'DAYS_30', 'DAYS_60', 'DAYS_90', 'MONTHS_12');
CREATE TYPE "CustomerTierMaintenanceMode" AS ENUM ('PERMANENT', 'DYNAMIC');
CREATE TYPE "CustomerTierName" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'VIP');

ALTER TABLE "customer_tier_settings"
  ADD COLUMN "tier_qualification_window" "CustomerTierQualificationWindow" NOT NULL DEFAULT 'DAYS_90',
  ADD COLUMN "tier_maintenance_mode" "CustomerTierMaintenanceMode" NOT NULL DEFAULT 'DYNAMIC',
  ADD COLUMN "silver_visit_requirement" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "gold_visit_requirement" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "vip_visit_requirement" INTEGER NOT NULL DEFAULT 30;

UPDATE "customer_tier_settings"
SET
  "criteria" = 'VISITS_ONLY',
  "silver_visit_requirement" = CASE WHEN "premium_visits" > 0 THEN "premium_visits" ELSE 5 END,
  "gold_visit_requirement" = CASE WHEN "elite_visits" > 0 THEN "elite_visits" ELSE 15 END,
  "vip_visit_requirement" = CASE WHEN "royal_vip_visits" > 0 THEN "royal_vip_visits" ELSE 30 END;

UPDATE "customer_tier_settings"
SET
  "gold_visit_requirement" = GREATEST("gold_visit_requirement", "silver_visit_requirement" + 1),
  "vip_visit_requirement" = GREATEST("vip_visit_requirement", GREATEST("gold_visit_requirement", "silver_visit_requirement" + 1) + 1);

ALTER TABLE "business_customer_memberships"
  ADD COLUMN "current_tier" "CustomerTierName" NOT NULL DEFAULT 'BRONZE',
  ADD COLUMN "tier_updated_at" TIMESTAMP(3);

ALTER TABLE "customer_tier_settings"
  ADD CONSTRAINT "customer_tier_settings_visit_requirements_check"
  CHECK (
    "criteria" = 'VISITS_ONLY'
    AND "silver_visit_requirement" > 0
    AND "gold_visit_requirement" > "silver_visit_requirement"
    AND "vip_visit_requirement" > "gold_visit_requirement"
  );

CREATE INDEX "business_customer_memberships_current_tier_idx" ON "business_customer_memberships"("business_id", "current_tier");
