INSERT INTO "abuse_policies" (
  "business_id",
  "policy_name",
  "rule_type",
  "threshold_value",
  "severity",
  "enabled",
  "dedupe_window_hours",
  "updated_at"
)
SELECT
  b."id",
  'High reward activity',
  'HIGH_REWARD_ACTIVITY_THRESHOLD',
  5,
  'HIGH'::"ActivityAlertSeverity",
  true,
  24,
  CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("business_id", "rule_type") DO NOTHING;
