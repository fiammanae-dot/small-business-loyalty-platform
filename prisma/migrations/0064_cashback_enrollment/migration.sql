-- Cashback becomes a program customers JOIN, like stamp and membership
-- programs, instead of applying to every customer automatically.

-- 1. Membership marker on the customer. NULL = not in the cashback program.
ALTER TABLE "business_customer_memberships"
    ADD COLUMN "cashback_joined_at" TIMESTAMP(3);

-- 2. Nobody loses money: every customer who already has cashback history or a
--    balance is enrolled, dated from their first cashback movement.
UPDATE "business_customer_memberships" AS m
SET "cashback_joined_at" = COALESCE(
        (SELECT MIN(t."created_at")
           FROM "cashback_transactions" AS t
          WHERE t."business_customer_membership_id" = m."id"),
        CURRENT_TIMESTAMP)
WHERE m."cashback_joined_at" IS NULL
  AND (m."cashback_balance" > 0
       OR EXISTS (SELECT 1 FROM "cashback_transactions" AS t
                   WHERE t."business_customer_membership_id" = m."id"));

-- 3. Public join link for the cashback program (/join/cashback/<token>).
ALTER TABLE "business_cashback_settings"
    ADD COLUMN "join_token" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "business_cashback_settings_join_token_key"
    ON "business_cashback_settings"("join_token");
