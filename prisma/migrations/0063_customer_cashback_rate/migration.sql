-- Per-customer cashback rate override. NULL means the customer earns the
-- business-wide default rate; a value overrides it for that customer only.
-- Additive and nullable, so the running app is unaffected until it is set.
ALTER TABLE "business_customer_memberships"
    ADD COLUMN "cashback_rate_override" DECIMAL(5,2);
