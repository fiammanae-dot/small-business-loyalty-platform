-- One referral reward per business (instead of one per stamp program plus one
-- in the cashback setup). Existing businesses keep what they had: bonus stamps
-- on their first stamp program when they have one, otherwise their cashback
-- referral amount, otherwise none.

DO $$ BEGIN
  CREATE TYPE "ReferralRewardType" AS ENUM ('NONE', 'STAMPS', 'CASHBACK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "business_referral_settings" (
  "id" SERIAL PRIMARY KEY,
  "business_id" INTEGER NOT NULL UNIQUE REFERENCES "businesses"("id") ON DELETE CASCADE,
  "reward_type" "ReferralRewardType" NOT NULL DEFAULT 'NONE',
  "stamp_program_id" INTEGER REFERENCES "loyalty_programs"("id") ON DELETE SET NULL,
  "referrer_stamps" INTEGER NOT NULL DEFAULT 1,
  "friend_stamps" INTEGER NOT NULL DEFAULT 0,
  "referrer_cashback" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "friend_cashback" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Businesses with a stamp program: bonus stamps on their oldest active stamp program.
INSERT INTO "business_referral_settings" ("business_id", "reward_type", "stamp_program_id", "referrer_stamps", "updated_at")
SELECT p."business_id", 'STAMPS', p."id", GREATEST(0, p."referral_reward_bonus_stamps"), CURRENT_TIMESTAMP
FROM "loyalty_programs" p
JOIN (
  SELECT "business_id", MIN("id") AS "id"
  FROM "loyalty_programs"
  WHERE "active" = TRUE AND "is_membership" = FALSE
  GROUP BY "business_id"
) first ON first."id" = p."id"
ON CONFLICT ("business_id") DO NOTHING;

-- Businesses without one but with a cashback referral amount: cashback.
INSERT INTO "business_referral_settings" ("business_id", "reward_type", "referrer_cashback", "updated_at")
SELECT c."business_id", 'CASHBACK', c."referral_reward_amount", CURRENT_TIMESTAMP
FROM "business_cashback_settings" c
WHERE c."referral_reward_amount" IS NOT NULL AND c."referral_reward_amount" > 0
ON CONFLICT ("business_id") DO NOTHING;
