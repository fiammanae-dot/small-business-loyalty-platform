-- Multi Branch is sold at AED 3,000 a year (yearly only), as on the pricing
-- page. The plan row still carried the earlier AED 1,000 figure.
UPDATE "subscription_plans"
SET "annual_price" = 3000.00, "monthly_price" = 0.00, "billing_cycle_support" = '["YEARLY"]'::jsonb, "updated_at" = NOW()
WHERE "code" = 'MULTI_BRANCH';
