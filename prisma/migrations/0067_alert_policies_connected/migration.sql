-- Connect Settings > Alert policies to the real alert rules.
-- 1) Every business gets a row for each rule (existing rows and owner changes are kept).

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Several stamps at once', 'MULTI_STAMP_THRESHOLD', 3, 'LOW'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Repeated stamps within 10 minutes', 'REPEATED_STAMPS_SHORT_WINDOW', 3, 'MEDIUM'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Customer stamps in 24 hours', 'CUSTOMER_DAILY_STAMP_LIMIT', 8, 'HIGH'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Staff stamps in 24 hours', 'STAFF_DAILY_STAMP_LIMIT', 50, 'HIGH'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Card filled on the first day', 'FAST_REWARD_PROGRESS', 24, 'MEDIUM'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Undone stamps', 'HIGH_STAMP_UNDO_COUNT', 3, 'MEDIUM'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Loyalty rule breaks', 'COOLDOWN_VIOLATION_THRESHOLD', 3, 'HIGH'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Invalid scans', 'INVALID_SCAN_THRESHOLD', 10, 'MEDIUM'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Other businesses'' cards', 'WRONG_BUSINESS_SCAN_THRESHOLD', 3, 'MEDIUM'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Referral volume', 'REFERRAL_ABUSE_THRESHOLD', 5, 'HIGH'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Rewards redeemed by one staff member', 'HIGH_REWARD_ACTIVITY_THRESHOLD', 5, 'HIGH'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Cashback on a large bill', 'CASHBACK_LARGE_BILL', 5000, 'MEDIUM'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Cashback added often', 'CASHBACK_FREQUENT_EARN', 3, 'HIGH'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", 'Large cashback redemption', 'CASHBACK_LARGE_REDEMPTION', 500, 'MEDIUM'::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;

-- 2) Plain-language names for the rules (thresholds, levels and on/off are untouched).
UPDATE "abuse_policies" SET "policy_name" = 'Several stamps at once', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'MULTI_STAMP_THRESHOLD' AND "policy_name" <> 'Several stamps at once';
UPDATE "abuse_policies" SET "policy_name" = 'Repeated stamps within 10 minutes', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'REPEATED_STAMPS_SHORT_WINDOW' AND "policy_name" <> 'Repeated stamps within 10 minutes';
UPDATE "abuse_policies" SET "policy_name" = 'Customer stamps in 24 hours', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'CUSTOMER_DAILY_STAMP_LIMIT' AND "policy_name" <> 'Customer stamps in 24 hours';
UPDATE "abuse_policies" SET "policy_name" = 'Staff stamps in 24 hours', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'STAFF_DAILY_STAMP_LIMIT' AND "policy_name" <> 'Staff stamps in 24 hours';
UPDATE "abuse_policies" SET "policy_name" = 'Card filled on the first day', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'FAST_REWARD_PROGRESS' AND "policy_name" <> 'Card filled on the first day';
UPDATE "abuse_policies" SET "policy_name" = 'Undone stamps', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'HIGH_STAMP_UNDO_COUNT' AND "policy_name" <> 'Undone stamps';
UPDATE "abuse_policies" SET "policy_name" = 'Loyalty rule breaks', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'COOLDOWN_VIOLATION_THRESHOLD' AND "policy_name" <> 'Loyalty rule breaks';
UPDATE "abuse_policies" SET "policy_name" = 'Invalid scans', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'INVALID_SCAN_THRESHOLD' AND "policy_name" <> 'Invalid scans';
UPDATE "abuse_policies" SET "policy_name" = 'Other businesses'' cards', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'WRONG_BUSINESS_SCAN_THRESHOLD' AND "policy_name" <> 'Other businesses'' cards';
UPDATE "abuse_policies" SET "policy_name" = 'Referral volume', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'REFERRAL_ABUSE_THRESHOLD' AND "policy_name" <> 'Referral volume';
UPDATE "abuse_policies" SET "policy_name" = 'Rewards redeemed by one staff member', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'HIGH_REWARD_ACTIVITY_THRESHOLD' AND "policy_name" <> 'Rewards redeemed by one staff member';
UPDATE "abuse_policies" SET "policy_name" = 'Cashback on a large bill', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'CASHBACK_LARGE_BILL' AND "policy_name" <> 'Cashback on a large bill';
UPDATE "abuse_policies" SET "policy_name" = 'Cashback added often', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'CASHBACK_FREQUENT_EARN' AND "policy_name" <> 'Cashback added often';
UPDATE "abuse_policies" SET "policy_name" = 'Large cashback redemption', "updated_at" = CURRENT_TIMESTAMP WHERE "rule_type" = 'CASHBACK_LARGE_REDEMPTION' AND "policy_name" <> 'Large cashback redemption';

-- 3) Existing alerts: the risk number now follows the level (LOW 25, MEDIUM 55,
--    HIGH 80, CRITICAL 95, +5 per repeat, max 100), and the level follows the risk.
UPDATE "activity_alerts"
SET "risk_score" = LEAST(100,
  (CASE "severity" WHEN 'LOW' THEN 25 WHEN 'MEDIUM' THEN 55 WHEN 'HIGH' THEN 80 ELSE 95 END)
  + GREATEST(0, "occurrence_count" - 1) * 5);

UPDATE "activity_alerts"
SET "priority" = (CASE WHEN "risk_score" >= 90 THEN 'CRITICAL' WHEN "risk_score" >= 70 THEN 'HIGH' WHEN "risk_score" >= 40 THEN 'MEDIUM' ELSE 'LOW' END)::"ActivityAlertSeverity";

UPDATE "activity_alerts"
SET "severity" = "priority"
WHERE (CASE "priority" WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 ELSE 4 END)
    > (CASE "severity" WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 ELSE 4 END);
