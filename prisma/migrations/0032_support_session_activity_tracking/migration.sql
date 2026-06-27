-- CreateEnum
CREATE TYPE "SupportSessionActivityType" AS ENUM (
  'SESSION_STARTED',
  'SESSION_JOINED',
  'PAGE_VIEWED',
  'CUSTOMER_VIEWED',
  'PROGRAM_VIEWED',
  'STAFF_VIEWED',
  'BRANCH_VIEWED',
  'SETTINGS_VIEWED',
  'RECORD_CHANGED',
  'SESSION_ENDED',
  'SESSION_EXPIRED'
);

-- CreateTable
CREATE TABLE "support_session_activities" (
  "id" SERIAL NOT NULL,
  "support_session_id" INTEGER NOT NULL,
  "admin_user_id" INTEGER NOT NULL,
  "business_id" INTEGER NOT NULL,
  "activity_type" "SupportSessionActivityType" NOT NULL,
  "path" TEXT,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_session_activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "support_session_activities"
  ADD CONSTRAINT "support_session_activities_support_session_id_fkey"
  FOREIGN KEY ("support_session_id") REFERENCES "support_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_session_activities"
  ADD CONSTRAINT "support_session_activities_admin_user_id_fkey"
  FOREIGN KEY ("admin_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_session_activities"
  ADD CONSTRAINT "support_session_activities_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "support_session_activities_support_session_id_created_at_idx"
  ON "support_session_activities"("support_session_id", "created_at");

-- CreateIndex
CREATE INDEX "support_session_activities_admin_user_id_created_at_idx"
  ON "support_session_activities"("admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "support_session_activities_business_id_created_at_idx"
  ON "support_session_activities"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "support_session_activities_activity_type_created_at_idx"
  ON "support_session_activities"("activity_type", "created_at");

-- CreateIndex
CREATE INDEX "support_session_activities_entity_type_entity_id_idx"
  ON "support_session_activities"("entity_type", "entity_id");
