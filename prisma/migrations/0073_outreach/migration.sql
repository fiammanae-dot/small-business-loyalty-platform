-- Manual WhatsApp outreach: per-business rules, promotions sent by hand, and a
-- log of every message sent or skipped (the 14-day quiet rule reads it).

DO $$ BEGIN
  CREATE TYPE "OutreachStatus" AS ENUM ('SENT', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OutreachCampaignStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "business_outreach_settings" (
  "id" SERIAL PRIMARY KEY,
  "business_id" INTEGER NOT NULL UNIQUE REFERENCES "businesses"("id") ON DELETE CASCADE,
  "enabled_events" "EngagementEventType"[] NOT NULL DEFAULT ARRAY['BIRTHDAY', 'INACTIVE_30_DAYS', 'INACTIVE_60_DAYS', 'INACTIVE_90_DAYS', 'REWARD_READY']::"EngagementEventType"[],
  "quiet_days" INTEGER NOT NULL DEFAULT 14,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "outreach_campaigns" (
  "id" SERIAL PRIMARY KEY,
  "uuid" UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "segment" TEXT NOT NULL,
  "status" "OutreachCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "outreach_campaigns_business_id_status_created_at_idx" ON "outreach_campaigns"("business_id", "status", "created_at");

CREATE TABLE IF NOT EXISTS "outreach_messages" (
  "id" SERIAL PRIMARY KEY,
  "uuid" UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "membership_id" INTEGER NOT NULL REFERENCES "business_customer_memberships"("id") ON DELETE CASCADE,
  "branch_id" INTEGER REFERENCES "branches"("id") ON DELETE SET NULL,
  "engagement_event_id" INTEGER UNIQUE REFERENCES "engagement_events"("id") ON DELETE SET NULL,
  "campaign_id" INTEGER REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE,
  "event_type" "EngagementEventType",
  "status" "OutreachStatus" NOT NULL,
  "text" TEXT NOT NULL,
  "sent_by_user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "outreach_messages_campaign_id_membership_id_key" ON "outreach_messages"("campaign_id", "membership_id");
CREATE INDEX IF NOT EXISTS "outreach_messages_business_id_membership_id_status_created_at_idx" ON "outreach_messages"("business_id", "membership_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "outreach_messages_business_id_created_at_idx" ON "outreach_messages"("business_id", "created_at");
