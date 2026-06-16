CREATE TYPE "CustomerNotificationType" AS ENUM (
  'NEW_STAMP_EARNED',
  'TIER_UPGRADED',
  'REWARD_AVAILABLE',
  'REFERRAL_REWARD_EARNED'
);

CREATE TYPE "CustomerNotificationDeliveryStatus" AS ENUM (
  'READY',
  'SENT_MANUALLY',
  'CANCELLED',
  'FAILED'
);

CREATE TABLE "customer_notification_templates" (
  "id" SERIAL PRIMARY KEY,
  "business_id" INTEGER,
  "notification_type" "CustomerNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_notification_templates_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "customer_notifications" (
  "id" SERIAL PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "business_customer_membership_id" INTEGER NOT NULL,
  "notification_type" "CustomerNotificationType" NOT NULL,
  "channel" "CommunicationChannel" NOT NULL DEFAULT 'WHATSAPP',
  "title" TEXT NOT NULL,
  "message_body" TEXT NOT NULL,
  "delivery_status" "CustomerNotificationDeliveryStatus" NOT NULL DEFAULT 'READY',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_notifications_uuid_key" UNIQUE ("uuid"),
  CONSTRAINT "customer_notifications_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "customer_notifications_membership_id_fkey"
    FOREIGN KEY ("business_customer_membership_id") REFERENCES "business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "customer_notification_templates_business_type_active_idx"
  ON "customer_notification_templates"("business_id", "notification_type", "active");

CREATE INDEX "customer_notifications_business_type_created_idx"
  ON "customer_notifications"("business_id", "notification_type", "created_at");

CREATE INDEX "customer_notifications_customer_created_idx"
  ON "customer_notifications"("business_customer_membership_id", "created_at");

CREATE INDEX "customer_notifications_business_status_created_idx"
  ON "customer_notifications"("business_id", "delivery_status", "created_at");

INSERT INTO "customer_notification_templates" ("business_id", "notification_type", "title", "message")
VALUES
  (NULL, 'NEW_STAMP_EARNED', 'New Stamp Earned', 'Great news {{customer_name}}! You earned {{quantity}} stamp{{quantity_plural}} at {{business_name}}. Your progress is now {{progress}}/{{required_stamps}}.'),
  (NULL, 'TIER_UPGRADED', 'Tier Upgraded', 'Congratulations {{customer_name}}! You are now a {{tier_name}} member at {{business_name}}.'),
  (NULL, 'REWARD_AVAILABLE', 'Reward Available', 'Congratulations {{customer_name}}! Your reward is ready at {{business_name}}: {{reward_name}}. Show your loyalty card QR code to redeem.'),
  (NULL, 'REFERRAL_REWARD_EARNED', 'Referral Reward Earned', 'Thank you {{customer_name}}! Your referral reward is ready at {{business_name}}. You earned {{bonus_stamps}} bonus stamp{{bonus_plural}}.');
