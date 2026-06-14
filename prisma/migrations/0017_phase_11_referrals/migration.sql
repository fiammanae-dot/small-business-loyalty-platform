CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'GRANTED', 'CANCELLED');
CREATE TYPE "ReferralEventType" AS ENUM ('REFERRAL_CREATED', 'SELF_REFERRAL_BLOCKED', 'REFERRAL_QUALIFIED', 'REWARD_GRANTED', 'REWARD_PENDING');

ALTER TABLE "business_customer_memberships"
  ADD COLUMN "referral_code" TEXT,
  ADD COLUMN "referral_enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "business_customer_memberships"
SET "referral_code" = 'ref_' || substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 24)
WHERE "referral_code" IS NULL;

CREATE UNIQUE INDEX "business_customer_memberships_referral_code_key" ON "business_customer_memberships"("referral_code");
CREATE INDEX "business_customer_memberships_business_id_referral_code_idx" ON "business_customer_memberships"("business_id", "referral_code");

ALTER TABLE "loyalty_programs"
  ADD COLUMN "referral_reward_bonus_stamps" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "referrals" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "referrer_membership_id" INTEGER NOT NULL,
  "referred_global_customer_id" INTEGER,
  "referred_membership_id" INTEGER,
  "referral_code" TEXT NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "source" TEXT NOT NULL DEFAULT 'LINK',
  "first_stamp_transaction_id" INTEGER,
  "referred_first_stamp_branch_id" INTEGER,
  "qualified_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_rewards" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "referral_id" INTEGER NOT NULL,
  "loyalty_program_id" INTEGER NOT NULL,
  "referrer_program_membership_id" INTEGER,
  "bonus_stamps" INTEGER NOT NULL DEFAULT 1,
  "status" "ReferralRewardStatus" NOT NULL DEFAULT 'GRANTED',
  "granted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_events" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "referral_id" INTEGER NOT NULL,
  "event_type" "ReferralEventType" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referrals_uuid_key" ON "referrals"("uuid");
CREATE UNIQUE INDEX "referrals_first_stamp_transaction_id_key" ON "referrals"("first_stamp_transaction_id");
CREATE UNIQUE INDEX "referrals_business_id_referred_membership_id_key" ON "referrals"("business_id", "referred_membership_id");
CREATE INDEX "referrals_business_id_status_idx" ON "referrals"("business_id", "status");
CREATE INDEX "referrals_referrer_membership_id_idx" ON "referrals"("referrer_membership_id");
CREATE INDEX "referrals_referred_membership_id_idx" ON "referrals"("referred_membership_id");
CREATE INDEX "referrals_referred_global_customer_id_idx" ON "referrals"("referred_global_customer_id");
CREATE INDEX "referrals_referral_code_idx" ON "referrals"("referral_code");

CREATE UNIQUE INDEX "referral_rewards_uuid_key" ON "referral_rewards"("uuid");
CREATE UNIQUE INDEX "referral_rewards_referral_id_loyalty_program_id_key" ON "referral_rewards"("referral_id", "loyalty_program_id");
CREATE INDEX "referral_rewards_business_id_status_idx" ON "referral_rewards"("business_id", "status");
CREATE INDEX "referral_rewards_loyalty_program_id_idx" ON "referral_rewards"("loyalty_program_id");
CREATE INDEX "referral_rewards_referrer_program_membership_id_idx" ON "referral_rewards"("referrer_program_membership_id");

CREATE UNIQUE INDEX "referral_events_uuid_key" ON "referral_events"("uuid");
CREATE INDEX "referral_events_business_id_event_type_created_at_idx" ON "referral_events"("business_id", "event_type", "created_at");
CREATE INDEX "referral_events_referral_id_created_at_idx" ON "referral_events"("referral_id", "created_at");

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_membership_id_fkey" FOREIGN KEY ("referrer_membership_id") REFERENCES "business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_global_customer_id_fkey" FOREIGN KEY ("referred_global_customer_id") REFERENCES "global_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_membership_id_fkey" FOREIGN KEY ("referred_membership_id") REFERENCES "business_customer_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_first_stamp_transaction_id_fkey" FOREIGN KEY ("first_stamp_transaction_id") REFERENCES "stamp_transactions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_first_stamp_branch_id_fkey" FOREIGN KEY ("referred_first_stamp_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_loyalty_program_id_fkey" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_program_membership_id_fkey" FOREIGN KEY ("referrer_program_membership_id") REFERENCES "customer_program_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_bonus_stamps_check" CHECK ("bonus_stamps" >= 0);
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_referral_reward_bonus_stamps_check" CHECK ("referral_reward_bonus_stamps" >= 0);
