CREATE TABLE "public"."reward_redemptions" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "branch_id" INTEGER,
  "customer_program_membership_id" INTEGER NOT NULL,
  "loyalty_program_id" INTEGER NOT NULL,
  "reward_name" TEXT NOT NULL,
  "required_stamps" INTEGER NOT NULL,
  "redeemed_by_user_id" INTEGER NOT NULL,
  "redeemed_at" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reward_redemptions_uuid_key" ON "public"."reward_redemptions"("uuid");
CREATE INDEX "reward_redemptions_business_id_idx" ON "public"."reward_redemptions"("business_id");
CREATE INDEX "reward_redemptions_branch_id_idx" ON "public"."reward_redemptions"("branch_id");
CREATE INDEX "reward_redemptions_customer_program_membership_id_idx" ON "public"."reward_redemptions"("customer_program_membership_id");
CREATE INDEX "reward_redemptions_loyalty_program_id_idx" ON "public"."reward_redemptions"("loyalty_program_id");
CREATE INDEX "reward_redemptions_redeemed_by_user_id_idx" ON "public"."reward_redemptions"("redeemed_by_user_id");
CREATE INDEX "reward_redemptions_redeemed_at_idx" ON "public"."reward_redemptions"("redeemed_at");

ALTER TABLE "public"."reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_customer_program_membership_id_fkey"
  FOREIGN KEY ("customer_program_membership_id") REFERENCES "public"."customer_program_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_loyalty_program_id_fkey"
  FOREIGN KEY ("loyalty_program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_redeemed_by_user_id_fkey"
  FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
