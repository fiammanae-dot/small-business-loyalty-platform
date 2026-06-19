DROP INDEX IF EXISTS "business_customer_memberships_referral_code_key";
DROP INDEX IF EXISTS "business_customer_memberships_business_id_referral_code_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "business_customer_memberships_business_id_referral_code_key"
  ON "business_customer_memberships"("business_id", "referral_code");
