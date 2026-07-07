CREATE TYPE "GoogleWalletSyncStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'DISABLED');

CREATE TABLE "google_wallet_classes" (
  "id" SERIAL NOT NULL,
  "issuer_id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "business_id" INTEGER NOT NULL,
  "loyalty_program_id" INTEGER NOT NULL,
  "status" "GoogleWalletSyncStatus" NOT NULL DEFAULT 'PENDING',
  "last_synced_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "google_wallet_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_wallet_objects" (
  "id" SERIAL NOT NULL,
  "business_id" INTEGER NOT NULL,
  "google_wallet_class_id" INTEGER NOT NULL,
  "customer_program_membership_id" INTEGER NOT NULL,
  "object_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "status" "GoogleWalletSyncStatus" NOT NULL DEFAULT 'PENDING',
  "save_url_last_generated_at" TIMESTAMP(3),
  "last_synced_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "google_wallet_objects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_wallet_classes_class_id_key" ON "google_wallet_classes"("class_id");
CREATE UNIQUE INDEX "google_wallet_classes_loyalty_program_id_key" ON "google_wallet_classes"("loyalty_program_id");
CREATE UNIQUE INDEX "google_wallet_classes_issuer_id_loyalty_program_id_key" ON "google_wallet_classes"("issuer_id", "loyalty_program_id");
CREATE INDEX "google_wallet_classes_business_id_idx" ON "google_wallet_classes"("business_id");
CREATE INDEX "google_wallet_classes_status_idx" ON "google_wallet_classes"("status");

CREATE UNIQUE INDEX "google_wallet_objects_customer_program_membership_id_key" ON "google_wallet_objects"("customer_program_membership_id");
CREATE UNIQUE INDEX "google_wallet_objects_object_id_key" ON "google_wallet_objects"("object_id");
CREATE INDEX "google_wallet_objects_business_id_idx" ON "google_wallet_objects"("business_id");
CREATE INDEX "google_wallet_objects_google_wallet_class_id_idx" ON "google_wallet_objects"("google_wallet_class_id");
CREATE INDEX "google_wallet_objects_status_idx" ON "google_wallet_objects"("status");

ALTER TABLE "google_wallet_classes" ADD CONSTRAINT "google_wallet_classes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_wallet_classes" ADD CONSTRAINT "google_wallet_classes_loyalty_program_id_fkey" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_wallet_objects" ADD CONSTRAINT "google_wallet_objects_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_wallet_objects" ADD CONSTRAINT "google_wallet_objects_google_wallet_class_id_fkey" FOREIGN KEY ("google_wallet_class_id") REFERENCES "google_wallet_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_wallet_objects" ADD CONSTRAINT "google_wallet_objects_customer_program_membership_id_fkey" FOREIGN KEY ("customer_program_membership_id") REFERENCES "customer_program_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
