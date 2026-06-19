CREATE TABLE IF NOT EXISTS "business_scanner_settings" (
  "id" SERIAL PRIMARY KEY,
  "business_id" INTEGER NOT NULL UNIQUE,
  "sound_effects_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_scanner_settings_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
