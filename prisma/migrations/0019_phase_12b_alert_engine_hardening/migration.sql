ALTER TYPE "ActivityAlertSeverity" ADD VALUE IF NOT EXISTS 'CRITICAL';
ALTER TYPE "ActivityAlertStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "ActivityAlertStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "ActivityAlertStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "ActivityAlertStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';

CREATE TYPE "AlertEventType" AS ENUM (
  'ALERT_CREATED',
  'ALERT_UPDATED',
  'ALERT_ASSIGNED',
  'ALERT_ESCALATED',
  'ALERT_RESOLVED',
  'ALERT_DISMISSED',
  'ALERT_REOPENED'
);

ALTER TABLE "activity_alerts"
  ADD COLUMN "priority" "ActivityAlertSeverity" NOT NULL DEFAULT 'LOW',
  ADD COLUMN "risk_score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dedupe_key" TEXT,
  ADD COLUMN "occurrence_count" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "first_detected_at" TIMESTAMP(3),
  ADD COLUMN "last_detected_at" TIMESTAMP(3),
  ADD COLUMN "assigned_to_user_id" INTEGER,
  ADD COLUMN "assigned_at" TIMESTAMP(3),
  ADD COLUMN "resolved_at" TIMESTAMP(3),
  ADD COLUMN "resolved_by_user_id" INTEGER,
  ADD COLUMN "dismissed_at" TIMESTAMP(3),
  ADD COLUMN "dismissed_by_user_id" INTEGER,
  ADD COLUMN "escalated_at" TIMESTAMP(3),
  ADD COLUMN "escalation_reason" TEXT;

UPDATE "activity_alerts"
SET
  "priority" = "severity",
  "risk_score" = CASE
    WHEN "severity" = 'LOW' THEN 25
    WHEN "severity" = 'MEDIUM' THEN 55
    WHEN "severity" = 'HIGH' THEN 80
    ELSE 0
  END,
  "first_detected_at" = COALESCE("first_detected_at", "created_at"),
  "last_detected_at" = COALESCE("last_detected_at", "created_at");

CREATE TABLE "abuse_policies" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "policy_name" TEXT NOT NULL,
  "rule_type" TEXT NOT NULL,
  "threshold_value" INTEGER NOT NULL,
  "severity" "ActivityAlertSeverity" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "dedupe_window_hours" INTEGER NOT NULL DEFAULT 24,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "abuse_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alert_events" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "alert_id" INTEGER NOT NULL,
  "business_id" INTEGER NOT NULL,
  "actor_user_id" INTEGER,
  "event_type" "AlertEventType" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "abuse_policies_uuid_key" ON "abuse_policies"("uuid");
CREATE UNIQUE INDEX "abuse_policies_business_id_rule_type_key" ON "abuse_policies"("business_id", "rule_type");
CREATE INDEX "abuse_policies_business_id_enabled_idx" ON "abuse_policies"("business_id", "enabled");

CREATE UNIQUE INDEX "alert_events_uuid_key" ON "alert_events"("uuid");
CREATE INDEX "alert_events_alert_id_created_at_idx" ON "alert_events"("alert_id", "created_at");
CREATE INDEX "alert_events_business_id_event_type_created_at_idx" ON "alert_events"("business_id", "event_type", "created_at");
CREATE INDEX "alert_events_actor_user_id_created_at_idx" ON "alert_events"("actor_user_id", "created_at");

CREATE INDEX "activity_alerts_business_id_priority_risk_score_idx" ON "activity_alerts"("business_id", "priority", "risk_score");
CREATE INDEX "activity_alerts_business_id_dedupe_key_last_detected_at_idx" ON "activity_alerts"("business_id", "dedupe_key", "last_detected_at");
CREATE INDEX "activity_alerts_assigned_to_user_id_idx" ON "activity_alerts"("assigned_to_user_id");

ALTER TABLE "activity_alerts" ADD CONSTRAINT "activity_alerts_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "activity_alerts" ADD CONSTRAINT "activity_alerts_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "activity_alerts" ADD CONSTRAINT "activity_alerts_dismissed_by_user_id_fkey" FOREIGN KEY ("dismissed_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "activity_alerts" ADD CONSTRAINT "activity_alerts_risk_score_check" CHECK ("risk_score" >= 0 AND "risk_score" <= 100);
ALTER TABLE "activity_alerts" ADD CONSTRAINT "activity_alerts_occurrence_count_check" CHECK ("occurrence_count" >= 1);

ALTER TABLE "abuse_policies" ADD CONSTRAINT "abuse_policies_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "abuse_policies" ADD CONSTRAINT "abuse_policies_threshold_value_check" CHECK ("threshold_value" >= 0);
ALTER TABLE "abuse_policies" ADD CONSTRAINT "abuse_policies_dedupe_window_hours_check" CHECK ("dedupe_window_hours" >= 1);

ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "activity_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

INSERT INTO "abuse_policies" ("business_id", "policy_name", "rule_type", "threshold_value", "severity", "enabled", "dedupe_window_hours", "updated_at")
SELECT b."id", policy."policy_name", policy."rule_type", policy."threshold_value", policy."severity"::"ActivityAlertSeverity", true, 24, CURRENT_TIMESTAMP
FROM "businesses" b
CROSS JOIN (
  VALUES
    ('Customer daily stamp limit', 'CUSTOMER_DAILY_STAMP_LIMIT', 8, 'HIGH'),
    ('Staff daily stamp limit', 'STAFF_DAILY_STAMP_LIMIT', 50, 'HIGH'),
    ('Multi-stamp threshold', 'MULTI_STAMP_THRESHOLD', 3, 'LOW'),
    ('Cooldown violation threshold', 'COOLDOWN_VIOLATION_THRESHOLD', 3, 'HIGH'),
    ('Invalid scan threshold', 'INVALID_SCAN_THRESHOLD', 10, 'MEDIUM'),
    ('Wrong-business scan threshold', 'WRONG_BUSINESS_SCAN_THRESHOLD', 3, 'MEDIUM'),
    ('Referral abuse threshold', 'REFERRAL_ABUSE_THRESHOLD', 5, 'HIGH')
) AS policy("policy_name", "rule_type", "threshold_value", "severity")
ON CONFLICT ("business_id", "rule_type") DO NOTHING;
