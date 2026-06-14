CREATE TABLE "public"."platform_settings" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_settings_key_key"
ON "public"."platform_settings"("key");

INSERT INTO "public"."platform_settings" ("key", "value")
VALUES ('demo_mode', '{"enabled": false}'::jsonb)
ON CONFLICT ("key") DO NOTHING;
