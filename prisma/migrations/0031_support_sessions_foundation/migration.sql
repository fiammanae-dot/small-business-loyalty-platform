CREATE TYPE "SupportSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');

CREATE TABLE "support_sessions" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "admin_user_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "read_only" BOOLEAN NOT NULL DEFAULT true,
    "status" "SupportSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_sessions_business_id_status_expires_at_idx" ON "support_sessions"("business_id", "status", "expires_at");
CREATE INDEX "support_sessions_admin_user_id_status_expires_at_idx" ON "support_sessions"("admin_user_id", "status", "expires_at");
CREATE INDEX "support_sessions_expires_at_idx" ON "support_sessions"("expires_at");

ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;