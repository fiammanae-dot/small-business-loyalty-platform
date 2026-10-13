-- Website "Request Demo" submissions, until now shown a thank-you and dropped.
DO $$ BEGIN
  CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'WON', 'LOST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "demo_requests" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_name" TEXT NOT NULL,
  "contact_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "business_type" TEXT NOT NULL,
  "branches" INTEGER NOT NULL,
  "message" TEXT,
  "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
  "note" TEXT,
  "ip_address" TEXT,
  "emailed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "demo_requests_uuid_key" ON "demo_requests"("uuid");
CREATE INDEX IF NOT EXISTS "demo_requests_status_created_at_idx" ON "demo_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "demo_requests_created_at_idx" ON "demo_requests"("created_at");
