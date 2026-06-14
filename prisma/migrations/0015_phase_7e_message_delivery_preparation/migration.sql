CREATE TYPE "public"."CommunicationChannel" AS ENUM (
  'WHATSAPP',
  'SMS',
  'EMAIL',
  'NONE'
);

CREATE TYPE "public"."MessageDeliveryStatus" AS ENUM (
  'DRAFT',
  'READY',
  'SENT_MANUALLY',
  'CANCELLED',
  'FAILED'
);

CREATE TABLE "public"."business_communication_settings" (
  "id" SERIAL NOT NULL,
  "business_id" INTEGER NOT NULL,
  "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
  "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
  "email_enabled" BOOLEAN NOT NULL DEFAULT false,
  "preferred_default_channel" "public"."CommunicationChannel" NOT NULL DEFAULT 'NONE',
  "whatsapp_business_number" TEXT,
  "sender_email" TEXT,
  "sender_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_communication_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_communication_settings_business_id_key"
ON "public"."business_communication_settings"("business_id");

CREATE TABLE "public"."message_delivery_queue" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "engagement_event_id" INTEGER,
  "business_customer_membership_id" INTEGER NOT NULL,
  "channel" "public"."CommunicationChannel" NOT NULL,
  "recipient_masked" TEXT NOT NULL,
  "message_body" TEXT NOT NULL,
  "status" "public"."MessageDeliveryStatus" NOT NULL DEFAULT 'READY',
  "provider_message_id" TEXT,
  "error_message" TEXT,
  "prepared_by_user_id" INTEGER,
  "sent_by_user_id" INTEGER,
  "prepared_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "message_delivery_queue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "message_delivery_queue_channel_not_none_check" CHECK ("channel" IN ('WHATSAPP', 'SMS', 'EMAIL'))
);

CREATE UNIQUE INDEX "message_delivery_queue_uuid_key"
ON "public"."message_delivery_queue"("uuid");

CREATE INDEX "message_delivery_queue_business_id_status_created_at_idx"
ON "public"."message_delivery_queue"("business_id", "status", "created_at");

CREATE INDEX "message_delivery_queue_business_id_channel_status_idx"
ON "public"."message_delivery_queue"("business_id", "channel", "status");

CREATE INDEX "message_delivery_queue_engagement_event_id_idx"
ON "public"."message_delivery_queue"("engagement_event_id");

CREATE INDEX "message_delivery_queue_business_customer_membership_id_idx"
ON "public"."message_delivery_queue"("business_customer_membership_id");

CREATE INDEX "message_delivery_queue_prepared_by_user_id_idx"
ON "public"."message_delivery_queue"("prepared_by_user_id");

CREATE INDEX "message_delivery_queue_sent_by_user_id_idx"
ON "public"."message_delivery_queue"("sent_by_user_id");

ALTER TABLE "public"."business_communication_settings"
ADD CONSTRAINT "business_communication_settings_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."message_delivery_queue"
ADD CONSTRAINT "message_delivery_queue_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."message_delivery_queue"
ADD CONSTRAINT "message_delivery_queue_engagement_event_id_fkey"
FOREIGN KEY ("engagement_event_id") REFERENCES "public"."engagement_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."message_delivery_queue"
ADD CONSTRAINT "message_delivery_queue_business_customer_membership_id_fkey"
FOREIGN KEY ("business_customer_membership_id") REFERENCES "public"."business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."message_delivery_queue"
ADD CONSTRAINT "message_delivery_queue_prepared_by_user_id_fkey"
FOREIGN KEY ("prepared_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."message_delivery_queue"
ADD CONSTRAINT "message_delivery_queue_sent_by_user_id_fkey"
FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "public"."prevent_message_queue_business_mismatch"()
RETURNS trigger AS $$
DECLARE
  membership_business_id integer;
  event_business_id integer;
BEGIN
  SELECT "business_id" INTO membership_business_id
  FROM "public"."business_customer_memberships"
  WHERE "id" = NEW."business_customer_membership_id";

  IF membership_business_id IS NULL OR membership_business_id <> NEW."business_id" THEN
    RAISE EXCEPTION 'message_delivery_queue.business_customer_membership_id must belong to the same business_id';
  END IF;

  IF NEW."engagement_event_id" IS NOT NULL THEN
    SELECT "business_id" INTO event_business_id
    FROM "public"."engagement_events"
    WHERE "id" = NEW."engagement_event_id";

    IF event_business_id IS NULL OR event_business_id <> NEW."business_id" THEN
      RAISE EXCEPTION 'message_delivery_queue.engagement_event_id must belong to the same business_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "message_delivery_queue_prevent_business_mismatch"
BEFORE INSERT OR UPDATE OF "business_id", "business_customer_membership_id", "engagement_event_id"
ON "public"."message_delivery_queue"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_message_queue_business_mismatch"();

