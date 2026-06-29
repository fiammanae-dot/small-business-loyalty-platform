ALTER TABLE "public"."loyalty_programs"
ADD COLUMN IF NOT EXISTS "join_token" UUID;

UPDATE "public"."loyalty_programs"
SET "join_token" = gen_random_uuid()
WHERE "join_token" IS NULL;

ALTER TABLE "public"."loyalty_programs"
ALTER COLUMN "join_token" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "join_token" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_programs_join_token_key"
ON "public"."loyalty_programs"("join_token");
