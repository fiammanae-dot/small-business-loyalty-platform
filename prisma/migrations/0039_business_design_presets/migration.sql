CREATE TABLE "business_design_presets" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "card_design" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_design_presets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_design_presets_uuid_key" ON "business_design_presets"("uuid");
CREATE UNIQUE INDEX "business_design_presets_business_id_name_key" ON "business_design_presets"("business_id", "name");
CREATE INDEX "business_design_presets_business_id_created_at_idx" ON "business_design_presets"("business_id", "created_at");

ALTER TABLE "business_design_presets"
ADD CONSTRAINT "business_design_presets_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
