CREATE TYPE "public"."EngagementEventType" AS ENUM (
  'REWARD_READY',
  'NEAR_REWARD',
  'BIRTHDAY',
  'INACTIVE_30_DAYS',
  'INACTIVE_60_DAYS',
  'INACTIVE_90_DAYS',
  'WELCOME_CUSTOMER',
  'REWARD_REDEEMED'
);

CREATE TYPE "public"."EngagementEventStatus" AS ENUM (
  'ACTIVE',
  'DISMISSED',
  'RESOLVED'
);

CREATE TABLE "public"."engagement_events" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "event_type" "public"."EngagementEventType" NOT NULL,
  "event_date" TIMESTAMP(3) NOT NULL,
  "status" "public"."EngagementEventStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "engagement_events_uuid_key"
ON "public"."engagement_events"("uuid");

CREATE INDEX "engagement_events_business_id_event_type_event_date_idx"
ON "public"."engagement_events"("business_id", "event_type", "event_date");

CREATE INDEX "engagement_events_business_id_status_event_date_idx"
ON "public"."engagement_events"("business_id", "status", "event_date");

CREATE INDEX "engagement_events_customer_id_event_date_idx"
ON "public"."engagement_events"("customer_id", "event_date");

CREATE UNIQUE INDEX "engagement_events_one_active_type_per_customer_idx"
ON "public"."engagement_events"("business_id", "customer_id", "event_type")
WHERE "status" = 'ACTIVE'
  AND "event_type" IN (
    'REWARD_READY',
    'NEAR_REWARD',
    'BIRTHDAY',
    'INACTIVE_30_DAYS',
    'INACTIVE_60_DAYS',
    'INACTIVE_90_DAYS'
  );

CREATE TABLE "public"."message_templates" (
  "id" SERIAL NOT NULL,
  "business_id" INTEGER,
  "template_type" "public"."EngagementEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "message_templates_business_id_template_type_active_idx"
ON "public"."message_templates"("business_id", "template_type", "active");

CREATE UNIQUE INDEX "message_templates_global_template_type_key"
ON "public"."message_templates"("template_type")
WHERE "business_id" IS NULL;

ALTER TABLE "public"."engagement_events"
ADD CONSTRAINT "engagement_events_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."engagement_events"
ADD CONSTRAINT "engagement_events_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "public"."business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."message_templates"
ADD CONSTRAINT "message_templates_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "public"."prevent_engagement_customer_business_mismatch"()
RETURNS trigger AS $$
DECLARE
  membership_business_id integer;
BEGIN
  SELECT "business_id" INTO membership_business_id
  FROM "public"."business_customer_memberships"
  WHERE "id" = NEW."customer_id";

  IF membership_business_id IS NULL OR membership_business_id <> NEW."business_id" THEN
    RAISE EXCEPTION 'engagement_events.customer_id must belong to the same business_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "engagement_events_prevent_customer_business_mismatch"
BEFORE INSERT OR UPDATE OF "business_id", "customer_id" ON "public"."engagement_events"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_engagement_customer_business_mismatch"();

INSERT INTO "public"."message_templates" ("business_id", "template_type", "title", "message", "active")
VALUES
  (NULL, 'REWARD_READY', 'Reward Ready', '🎉 Congratulations! Your reward is ready to redeem.', true),
  (NULL, 'NEAR_REWARD', 'Near Reward', '⭐ You''re only {{remaining_stamps}} stamps away from your reward.', true),
  (NULL, 'BIRTHDAY', 'Birthday', '🎂 Happy Birthday! Enjoy a special reward from us.', true),
  (NULL, 'INACTIVE_30_DAYS', 'Inactive Customer', 'We miss you. Visit us again and continue earning rewards.', true),
  (NULL, 'INACTIVE_60_DAYS', 'Inactive Customer', 'We miss you. Visit us again and continue earning rewards.', true),
  (NULL, 'INACTIVE_90_DAYS', 'Inactive Customer', 'We miss you. Visit us again and continue earning rewards.', true),
  (NULL, 'WELCOME_CUSTOMER', 'Welcome Customer', 'Welcome to our loyalty program.', true),
  (NULL, 'REWARD_REDEEMED', 'Reward Redeemed', '🎁 Thank you for redeeming your reward.', true)
ON CONFLICT DO NOTHING;
