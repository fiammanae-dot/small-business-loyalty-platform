CREATE TYPE "StartingStampPolicy" AS ENUM ('NEVER', 'FIRST_ENROLLMENT_ONLY', 'EVERY_COMPLETED_CARD');

ALTER TABLE "loyalty_programs"
  ADD COLUMN "starting_stamp_policy" "StartingStampPolicy" NOT NULL DEFAULT 'FIRST_ENROLLMENT_ONLY';

UPDATE "loyalty_programs"
SET "starting_stamp_policy" = CASE
  WHEN "starting_bonus_stamps" = 0 THEN 'NEVER'::"StartingStampPolicy"
  ELSE 'EVERY_COMPLETED_CARD'::"StartingStampPolicy"
END;
