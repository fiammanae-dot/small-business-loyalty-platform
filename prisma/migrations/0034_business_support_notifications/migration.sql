-- CreateTable
CREATE TABLE "business_notifications" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_notifications_uuid_key" ON "business_notifications"("uuid");

-- CreateIndex
CREATE INDEX "business_notifications_business_id_created_at_idx" ON "business_notifications"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "business_notifications_business_id_read_at_idx" ON "business_notifications"("business_id", "read_at");

-- AddForeignKey
ALTER TABLE "business_notifications" ADD CONSTRAINT "business_notifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
