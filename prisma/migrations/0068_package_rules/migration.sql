-- Package rules chosen by the owner when creating a package.
-- Defaults keep every existing package working exactly as before.
DO $$ BEGIN
  CREATE TYPE "PackageValidity" AS ENUM ('LIFETIME', 'MONTHLY_FORFEIT', 'FIXED_TERM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "loyalty_programs"
  ADD COLUMN IF NOT EXISTS "package_validity" "PackageValidity" NOT NULL DEFAULT 'MONTHLY_FORFEIT',
  ADD COLUMN IF NOT EXISTS "package_term_months" INTEGER,
  ADD COLUMN IF NOT EXISTS "package_one_visit_per_month" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "package_unique_treatments" BOOLEAN NOT NULL DEFAULT false;
