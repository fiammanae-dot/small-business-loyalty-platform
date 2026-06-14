-- CreateEnum
CREATE TYPE "public"."CustomerSource" AS ENUM ('STAFF', 'OWNER', 'IMPORT', 'SELF_SIGNUP');

-- CreateEnum
CREATE TYPE "public"."CustomerMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "public"."global_customers" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "phone" TEXT NOT NULL,
    "normalized_phone" TEXT NOT NULL,
    "email" TEXT,
    "birthday" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_customer_memberships" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "global_customer_id" INTEGER NOT NULL,
    "business_id" INTEGER NOT NULL,
    "created_branch_id" INTEGER,
    "created_by_user_id" INTEGER,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "source" "public"."CustomerSource" NOT NULL DEFAULT 'OWNER',
    "status" "public"."CustomerMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_customer_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_customers_uuid_key" ON "public"."global_customers"("uuid" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "global_customers_normalized_phone_key" ON "public"."global_customers"("normalized_phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "business_customer_memberships_uuid_key" ON "public"."business_customer_memberships"("uuid" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "business_customer_memberships_business_id_global_customer_id_key" ON "public"."business_customer_memberships"("business_id" ASC, "global_customer_id" ASC);

-- CreateIndex
CREATE INDEX "business_customer_memberships_global_customer_id_idx" ON "public"."business_customer_memberships"("global_customer_id" ASC);

-- CreateIndex
CREATE INDEX "business_customer_memberships_business_id_idx" ON "public"."business_customer_memberships"("business_id" ASC);

-- CreateIndex
CREATE INDEX "business_customer_memberships_created_branch_id_idx" ON "public"."business_customer_memberships"("created_branch_id" ASC);

-- CreateIndex
CREATE INDEX "business_customer_memberships_created_by_user_id_idx" ON "public"."business_customer_memberships"("created_by_user_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."business_customer_memberships" ADD CONSTRAINT "business_customer_memberships_global_customer_id_fkey" FOREIGN KEY ("global_customer_id") REFERENCES "public"."global_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_customer_memberships" ADD CONSTRAINT "business_customer_memberships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_customer_memberships" ADD CONSTRAINT "business_customer_memberships_created_branch_id_fkey" FOREIGN KEY ("created_branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_customer_memberships" ADD CONSTRAINT "business_customer_memberships_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
