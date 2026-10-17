-- The language a customer chose (join page or card): "en" or "ar". Null until
-- they choose. Wallet pass fields and messages to the customer follow it.
ALTER TABLE "business_customer_memberships"
  ADD COLUMN IF NOT EXISTS "preferred_locale" TEXT;
