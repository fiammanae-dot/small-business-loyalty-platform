-- Phase 1 of per-business WhatsApp automation.
--
-- Additive and backward compatible: one new table plus one new enum value. No
-- existing column changes, no backfill, no downtime. Every business starts with
-- no row at all, and a row that is inserted starts NOT_CONNECTED with a PENDING
-- template, so the automated send path stays dormant until real Meta credentials
-- and an approved template are supplied per business.

-- CreateEnum
CREATE TYPE "WhatsAppProvider" AS ENUM ('META_CLOUD_API', 'THREE_SIXTY_DIALOG');

-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum: an automated provider send, distinct from SENT_MANUALLY (a staff
-- member sending through a wa.me link). Appended after SENT_MANUALLY so the
-- database enum order matches the Prisma schema declaration order.
ALTER TYPE "MessageDeliveryStatus" ADD VALUE 'SENT' AFTER 'SENT_MANUALLY';

-- CreateTable: one WhatsApp sending channel per business. Each business sends
-- from its own number under its own credentials, so this is never platform-wide.
-- access_token_encrypted holds AES-256-GCM ciphertext, never a raw token.
CREATE TABLE "business_whatsapp_channels" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL DEFAULT 'META_CLOUD_API',
    "phone_number_id" TEXT NOT NULL,
    "waba_id" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "connection_status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "welcome_template_name" TEXT NOT NULL,
    "welcome_template_language" TEXT NOT NULL DEFAULT 'en',
    "welcome_template_status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'PENDING',
    "last_error_message" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_whatsapp_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_whatsapp_channels_uuid_key" ON "business_whatsapp_channels"("uuid");

-- CreateIndex: a business has at most one channel.
CREATE UNIQUE INDEX "business_whatsapp_channels_business_id_key" ON "business_whatsapp_channels"("business_id");

-- CreateIndex
CREATE INDEX "business_whatsapp_channels_connection_status_idx" ON "business_whatsapp_channels"("connection_status");

-- AddForeignKey
ALTER TABLE "business_whatsapp_channels" ADD CONSTRAINT "business_whatsapp_channels_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
