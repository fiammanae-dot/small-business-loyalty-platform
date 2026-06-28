CREATE TYPE "SupportAccessPolicy" AS ENUM ('IMMEDIATE', 'APPROVAL_REQUIRED', 'EMERGENCY_ACCESS');
CREATE TYPE "SupportRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

ALTER TABLE "businesses"
  ADD COLUMN "support_access_policy" "SupportAccessPolicy" NOT NULL DEFAULT 'IMMEDIATE';

CREATE TABLE "support_requests" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "requested_by_user_id" INTEGER NOT NULL,
  "reviewed_by_user_id" INTEGER,
  "reason" TEXT NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "read_only" BOOLEAN NOT NULL DEFAULT true,
  "emergency" BOOLEAN NOT NULL DEFAULT false,
  "status" "SupportRequestStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "reviewed_at" TIMESTAMP(3),
  "response_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "support_sessions"
  ADD COLUMN "support_request_id" INTEGER;

CREATE UNIQUE INDEX "support_requests_uuid_key" ON "support_requests"("uuid");
CREATE UNIQUE INDEX "support_sessions_support_request_id_key" ON "support_sessions"("support_request_id");
CREATE INDEX "support_requests_business_id_status_expires_at_idx" ON "support_requests"("business_id", "status", "expires_at");
CREATE INDEX "support_requests_requested_by_user_id_status_created_at_idx" ON "support_requests"("requested_by_user_id", "status", "created_at");
CREATE INDEX "support_requests_reviewed_by_user_id_reviewed_at_idx" ON "support_requests"("reviewed_by_user_id", "reviewed_at");
CREATE INDEX "support_requests_status_expires_at_idx" ON "support_requests"("status", "expires_at");

ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_support_request_id_fkey" FOREIGN KEY ("support_request_id") REFERENCES "support_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
