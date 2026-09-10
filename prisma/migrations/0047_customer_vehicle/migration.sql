-- Vehicle identity for car care businesses.
--
-- Additive and backward compatible: three new enums plus eight nullable
-- columns on an existing table. No backfill, no downtime, nothing to migrate.
-- Every existing customer keeps a null vehicle, which is correct - a coffee
-- shop customer has no plate, and a car wash enters them as customers are seen.
--
-- normalized_plate is the derived, indexed key ("DUBAI-A-12345"). The entered
-- columns are kept for display, exactly as phone/normalized_phone already
-- works. Deliberately NOT unique: cars are sold and families share
-- them, and a hard constraint would block a real enrolment at the counter.

-- CreateEnum
CREATE TYPE "VehicleEmirate" AS ENUM (
  'ABU_DHABI', 'DUBAI', 'SHARJAH', 'AJMAN', 'UMM_AL_QUWAIN', 'RAS_AL_KHAIMAH', 'FUJAIRAH'
);

-- Colour and size are closed sets and get real enums. Brand and model are open
-- sets and stay TEXT: new brands reach the UAE market constantly, and adding
-- one must be a code edit rather than a migration against a live database.
CREATE TYPE "VehicleColour" AS ENUM (
  'WHITE', 'BLACK', 'SILVER', 'GREY', 'BLUE', 'RED', 'BROWN', 'BEIGE',
  'GOLD', 'GREEN', 'YELLOW', 'ORANGE', 'MAROON', 'PURPLE', 'OTHER'
);

CREATE TYPE "VehicleSize" AS ENUM (
  'SMALL_CAR', 'SEDAN', 'SUV', 'LARGE_SUV', 'PICKUP', 'VAN', 'MOTORCYCLE'
);

-- AlterTable
ALTER TABLE "business_customer_memberships"
  ADD COLUMN "vehicle_emirate"  "VehicleEmirate",
  ADD COLUMN "vehicle_code"     TEXT,
  ADD COLUMN "vehicle_number"   TEXT,
  ADD COLUMN "normalized_plate" TEXT,
  ADD COLUMN "vehicle_brand"    TEXT,
  ADD COLUMN "vehicle_model"    TEXT,
  ADD COLUMN "vehicle_colour"   "VehicleColour",
  ADD COLUMN "vehicle_size"     "VehicleSize";

-- CreateIndex: plate lookup is always scoped to one business, so the composite
-- index is the one that gets used. Partial, because only car care businesses
-- populate it and the index should not carry a row per coffee shop customer.
CREATE INDEX "business_customer_memberships_business_id_normalized_plate_idx"
  ON "business_customer_memberships"("business_id", "normalized_plate")
  WHERE "normalized_plate" IS NOT NULL;
