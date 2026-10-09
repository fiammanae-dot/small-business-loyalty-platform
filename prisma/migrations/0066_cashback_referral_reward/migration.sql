-- Cashback referrals: the fixed cashback amount a referrer earns when a friend
-- they referred makes their first cashback purchase. Additive and nullable
-- (NULL = no reward), so the running app is unaffected until it is set.
ALTER TABLE "business_cashback_settings"
    ADD COLUMN "referral_reward_amount" DECIMAL(12,2);
