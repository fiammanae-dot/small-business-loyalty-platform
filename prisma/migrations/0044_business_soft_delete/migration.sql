-- AlterTable: soft-delete/archive fields on businesses
ALTER TABLE "businesses" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "businesses" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "businesses" ADD COLUMN "archived_by_id" INTEGER;
ALTER TABLE "businesses" ADD COLUMN "archive_reason" TEXT;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey: audit_events must never cascade-delete when a business row is removed
ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_business_id_fkey";

-- AddForeignKey: preserve audit history by nulling business_id instead of deleting rows
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
