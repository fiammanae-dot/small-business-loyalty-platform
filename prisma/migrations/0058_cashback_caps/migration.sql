-- Phase 4.1: configurable per-transaction caps for the cashback wallet. Optional
-- owner-set limits (NULL = no cap): the maximum bill an EARN can be calculated
-- from, and the maximum a single SPEND can redeem. Additive and nullable, so
-- existing settings rows are unaffected (no caps until the owner sets them).
ALTER TABLE "business_cashback_settings"
    ADD COLUMN "max_bill_amount" DECIMAL(12,2),
    ADD COLUMN "max_redemption" DECIMAL(12,2);
