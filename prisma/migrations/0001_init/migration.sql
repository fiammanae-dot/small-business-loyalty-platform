-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BusinessType" AS ENUM ('COFFEE_SHOP', 'RESTAURANT', 'BARBERSHOP', 'BEAUTY_SALON', 'CAR_CARE_CENTER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIALING', 'CANCELED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('PLATFORM_OWNER', 'BUSINESS_OWNER', 'BRANCH_MANAGER', 'STAFF');

-- CreateTable
CREATE TABLE "public"."branches" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_branding" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#F97316',
    "secondary_color" TEXT NOT NULL DEFAULT '#FDBA74',
    "background_color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "text_color" TEXT NOT NULL DEFAULT '#111827',
    "button_color" TEXT NOT NULL DEFAULT '#F97316',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_subscriptions" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."businesses" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "business_type" "public"."BusinessType" NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "max_branches" INTEGER NOT NULL,
    "max_loyalty_programs" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "price_monthly" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "business_id" INTEGER,
    "branch_id" INTEGER,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branches_business_id_idx" ON "public"."branches"("business_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "branches_uuid_key" ON "public"."branches"("uuid" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "business_branding_business_id_key" ON "public"."business_branding"("business_id" ASC);

-- CreateIndex
CREATE INDEX "business_subscriptions_business_id_idx" ON "public"."business_subscriptions"("business_id" ASC);

-- CreateIndex
CREATE INDEX "business_subscriptions_subscription_plan_id_idx" ON "public"."business_subscriptions"("subscription_plan_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_uuid_key" ON "public"."businesses"("uuid" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "public"."subscription_plans"("name" ASC);

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "public"."users"("branch_id" ASC);

-- CreateIndex
CREATE INDEX "users_business_id_idx" ON "public"."users"("business_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "public"."users"("uuid" ASC);

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_branding" ADD CONSTRAINT "business_branding_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
