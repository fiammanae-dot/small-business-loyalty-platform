-- CreateEnum
CREATE TYPE "public"."ProgramMembershipStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ProgramEnrollmentSource" AS ENUM ('OWNER', 'BRANCH_MANAGER');

-- CreateTable
CREATE TABLE "public"."loyalty_programs" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "business_type" "public"."BusinessType" NOT NULL,
    "product_or_service_name" TEXT NOT NULL,
    "description" TEXT,
    "required_stamps" INTEGER NOT NULL,
    "starting_bonus_stamps" INTEGER NOT NULL DEFAULT 0,
    "reward_name" TEXT NOT NULL,
    "reward_description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_programs_required_stamps_check" CHECK ("required_stamps" >= 1),
    CONSTRAINT "loyalty_programs_bonus_stamps_check" CHECK ("starting_bonus_stamps" >= 0 AND "starting_bonus_stamps" <= "required_stamps")
);

-- CreateTable
CREATE TABLE "public"."customer_program_memberships" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "business_customer_membership_id" INTEGER NOT NULL,
    "loyalty_program_id" INTEGER NOT NULL,
    "earned_stamps" INTEGER NOT NULL DEFAULT 0,
    "bonus_stamps" INTEGER NOT NULL DEFAULT 0,
    "enrollment_source" "public"."ProgramEnrollmentSource" NOT NULL,
    "status" "public"."ProgramMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_program_memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_program_memberships_earned_stamps_check" CHECK ("earned_stamps" >= 0),
    CONSTRAINT "customer_program_memberships_bonus_stamps_check" CHECK ("bonus_stamps" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_programs_uuid_key" ON "public"."loyalty_programs"("uuid" ASC);

-- CreateIndex
CREATE INDEX "loyalty_programs_business_id_idx" ON "public"."loyalty_programs"("business_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_program_memberships_uuid_key" ON "public"."customer_program_memberships"("uuid" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_program_memberships_business_customer_membership_id_loyalty_program_id_key" ON "public"."customer_program_memberships"("business_customer_membership_id" ASC, "loyalty_program_id" ASC);

-- CreateIndex
CREATE INDEX "customer_program_memberships_business_customer_membership_id_idx" ON "public"."customer_program_memberships"("business_customer_membership_id" ASC);

-- CreateIndex
CREATE INDEX "customer_program_memberships_loyalty_program_id_idx" ON "public"."customer_program_memberships"("loyalty_program_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."loyalty_programs" ADD CONSTRAINT "loyalty_programs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_program_memberships" ADD CONSTRAINT "customer_program_memberships_business_customer_membership_id_fkey" FOREIGN KEY ("business_customer_membership_id") REFERENCES "public"."business_customer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_program_memberships" ADD CONSTRAINT "customer_program_memberships_loyalty_program_id_fkey" FOREIGN KEY ("loyalty_program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
