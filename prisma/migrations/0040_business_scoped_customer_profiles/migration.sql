ALTER TABLE "business_customer_memberships"
  ADD COLUMN "first_name" TEXT,
  ADD COLUMN "last_name" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "normalized_phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "birthday" TIMESTAMP(3);

UPDATE "business_customer_memberships" bcm
SET
  "first_name" = gc."first_name",
  "last_name" = gc."last_name",
  "phone" = gc."phone",
  "normalized_phone" = gc."normalized_phone",
  "email" = gc."email",
  "birthday" = gc."birthday"
FROM "global_customers" gc
WHERE bcm."global_customer_id" = gc."id";

ALTER TABLE "business_customer_memberships"
  ALTER COLUMN "first_name" SET NOT NULL,
  ALTER COLUMN "phone" SET NOT NULL,
  ALTER COLUMN "normalized_phone" SET NOT NULL;

CREATE UNIQUE INDEX "business_customer_memberships_business_id_normalized_phone_key"
  ON "business_customer_memberships"("business_id", "normalized_phone");

CREATE INDEX "business_customer_memberships_business_id_first_name_idx"
  ON "business_customer_memberships"("business_id", "first_name");

CREATE INDEX "business_customer_memberships_business_id_last_name_idx"
  ON "business_customer_memberships"("business_id", "last_name");
